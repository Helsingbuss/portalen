// src/pages/admin/pricing/index.tsx
import { useEffect, useMemo, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Trip = {
  id: string;
  title: string;
  year: number | null;
  price_from: number | null;
  published: boolean;
  next_date?: string | null;
};

type Departure = {
  trip_id: string;
  depart_date?: string | null;
  date?: string | null;
  dep_date?: string | null;
  departure_date?: string | null;
};

type TicketType = {
  id: string;
  name: string;
  code?: string | null;
};

type PricingRow = {
  id: number;
  trip_id: string;
  ticket_type_id: string;
  departure_date: string | null;
  price: number;
  currency: string | null;
};

type LoadResponse = {
  ok: boolean;
  error?: string;
  trips: Trip[];
  ticket_types: TicketType[];
  departures: Departure[];
  pricing: PricingRow[];
};

function money(n?: number | null) {
  if (n == null) return "";
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function PricingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [trips, setTrips] = useState<Trip[]>([]);
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [pricing, setPricing] = useState<PricingRow[]>([]);

  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [selectedTicketTypeId, setSelectedTicketTypeId] =
    useState<string>("");
  const [selectedDepartureDate, setSelectedDepartureDate] =
    useState<string>(""); // tom = standardpris
  const [priceInput, setPriceInput] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        setMessage(null);

        const res = await fetch("/api/admin/pricing/load");
        const json: LoadResponse = await res.json();

        if (!res.ok || json.ok === false) {
          throw new Error(json.error || "Kunde inte läsa prissättning.");
        }

        if (cancelled) return;

        setTrips(json.trips || []);
        setDepartures(json.departures || []);
        setTicketTypes(json.ticket_types || []);
        setPricing(json.pricing || []);

        // välj första resa/biljettyp automatiskt
        if (json.trips && json.trips.length && !selectedTripId) {
          setSelectedTripId(json.trips[0].id);
        }
        if (json.ticket_types && json.ticket_types.length && !selectedTicketTypeId) {
          setSelectedTicketTypeId(json.ticket_types[0].id);
        }
      } catch (e: any) {
        console.error(e);
        if (!cancelled) setError(e?.message || "Tekniskt fel.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tripOptions = useMemo(
    () =>
      trips
        .slice()
        .sort((a, b) => (a.title || "").localeCompare(b.title || "")),
    [trips]
  );

  const currentTrip = useMemo(
    () => tripOptions.find((t) => t.id === selectedTripId) || null,
    [tripOptions, selectedTripId]
  );

  // vilka datum finns för vald resa?
  const departuresForTrip = useMemo(() => {
    if (!selectedTripId) return [];
    const rowsForTrip = departures.filter(
      (d) => d.trip_id === selectedTripId
    );
    const unique = new Set<string>();

    for (const row of rowsForTrip) {
      const raw =
        row.date ||
        row.depart_date ||
        row.dep_date ||
        row.departure_date ||
        null;
      if (!raw) continue;

      const s = String(raw).slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        unique.add(s);
      }
    }

    return Array.from(unique).sort();
  }, [departures, selectedTripId]);

  const pricingForCurrent = useMemo(() => {
    if (!selectedTripId) return [];
    return pricing
      .filter((p) => p.trip_id === selectedTripId)
      .sort((a, b) => {
        const dA = a.departure_date || "";
        const dB = b.departure_date || "";
        if (dA === dB) return a.ticket_type_id.localeCompare(b.ticket_type_id);
        return dA.localeCompare(dB);
      });
  }, [pricing, selectedTripId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTripId) {
      setError("Välj en resa.");
      return;
    }
    if (!selectedTicketTypeId) {
      setError("Välj en biljett-typ.");
      return;
    }
    const price = Number(priceInput.replace(/[^\d]/g, ""));
    if (!price || Number.isNaN(price)) {
      setError("Ange ett pris i kronor.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      const body = {
        trip_id: selectedTripId,
        ticket_type_id: selectedTicketTypeId,
        departure_date: selectedDepartureDate || null, // tom = standardpris
        price,
      };

      const res = await fetch("/api/admin/pricing/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok || json.ok === false) {
        throw new Error(json.error || "Kunde inte spara pris.");
      }

      const saved: PricingRow = json.row;
      setPricing((prev) => {
        const others = prev.filter((p) => p.id !== saved.id);
        return [...others, saved];
      });

      setMessage("Pris sparat.");
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Tekniskt fel vid sparande.");
    } finally {
      setSaving(false);
    }
  }

  function handleEditRow(row: PricingRow) {
    setSelectedTripId(row.trip_id);
    setSelectedTicketTypeId(row.ticket_type_id);
    setSelectedDepartureDate(row.departure_date || "");
    setPriceInput(row.price ? String(row.price) : "");
    setMessage("Rad inläst för redigering. Uppdatera priset och klicka Spara.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDeleteRow(row: PricingRow) {
    if (
      !window.confirm(
        "Vill du ta bort detta pris? Detta går inte att ångra."
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      const res = await fetch("/api/admin/pricing/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id }),
      });

      const json = await res.json();
      if (!res.ok || json.ok === false) {
        throw new Error(json.error || "Kunde inte ta bort pris.");
      }

      setPricing((prev) => prev.filter((p) => p.id !== row.id));
      setMessage("Pris borttaget.");
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Tekniskt fel vid borttagning.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AdminMenu />
      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="px-6 pb-16 pt-14 lg:pt-20">
          {/* Rubrik, liknande "Skapa offert" */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-[#194C66]">
                Prissättning – biljetter
              </h1>
              <p className="text-sm text-slate-600">
                Sätt priser per resa, avgångsdatum och biljett-typ. Den här
                sidan används av kassan och bokningsformulären.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {message}
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-3">
            {/* Vänster: formulär (2/3 kolumner på desktop) */}
            <section className="xl:col-span-2">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-4 py-3 sm:px-6">
                  <h2 className="text-sm font-semibold text-[#194C66]">
                    Skapa / ändra pris
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Välj resa, biljett-typ och (om du vill) ett specifikt
                    avgångsdatum. Lämnar du datumet tomt blir det ett{" "}
                    <b>standardpris</b> som gäller alla avgångar.
                  </p>
                </div>

                <form
                  onSubmit={handleSave}
                  className="space-y-5 px-4 py-5 sm:px-6 sm:py-6"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="mb-1 text-xs font-medium text-[#194C66]/80">
                        Resa
                      </div>
                      <select
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                        value={selectedTripId}
                        onChange={(e) => setSelectedTripId(e.target.value)}
                      >
                        {!selectedTripId && <option value="">Välj resa…</option>}
                        {tripOptions.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}{" "}
                            {t.year ? `(${t.year})` : ""}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Resor hämtas från tabellen <code>trips</code>.
                      </p>
                    </div>

                    <div>
                      <div className="mb-1 text-xs font-medium text-[#194C66]/80">
                        Biljett-typ
                      </div>
                      <select
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                        value={selectedTicketTypeId}
                        onChange={(e) =>
                          setSelectedTicketTypeId(e.target.value)
                        }
                      >
                        {ticketTypes.length === 0 && (
                          <option value="">
                            Inga biljett-typer upplagda
                          </option>
                        )}
                        {ticketTypes.length > 0 && (
                          <>
                            <option value="">Välj biljett-typ…</option>
                            {ticketTypes.map((tt) => (
                              <option key={tt.id} value={tt.id}>
                                {tt.name}
                              </option>
                            ))}
                          </>
                        )}
                      </select>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Biljett-typer hämtas från <code>ticket_types</code>.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="mb-1 text-xs font-medium text-[#194C66]/80">
                        Avgångsdatum
                      </div>
                      <select
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                        value={selectedDepartureDate}
                        onChange={(e) =>
                          setSelectedDepartureDate(e.target.value)
                        }
                      >
                        <option value="">
                          Standardpris – gäller alla avgångar
                        </option>
                        {departuresForTrip.length === 0 ? (
                          <option value="" disabled>
                            Ingen avgång hittad för denna resa
                          </option>
                        ) : (
                          departuresForTrip.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))
                        )}
                      </select>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Datum hämtas från tabellen{" "}
                        <code>trip_departures</code>.
                      </p>
                    </div>

                    <div>
                      <div className="mb-1 text-xs font-medium text-[#194C66]/80">
                        Pris (SEK)
                      </div>
                      <input
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                        placeholder="t.ex. 295"
                        inputMode="numeric"
                        value={priceInput}
                        onChange={(e) =>
                          setPriceInput(e.target.value.replace(/[^\d]/g, ""))
                        }
                      />
                      <p className="mt-1 text-[11px] text-slate-500">
                        Endast hela kronor. Valutan sparas som SEK.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center justify-center rounded-[12px] bg-[#194C66] px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#163b4d] disabled:opacity-60"
                    >
                      {saving ? "Sparar…" : "Spara pris"}
                    </button>

                    {currentTrip && (
                      <div className="text-xs text-slate-600">
                        Vald resa:{" "}
                        <b>{currentTrip.title}</b>{" "}
                        {currentTrip.year ? `(${currentTrip.year})` : ""}
                      </div>
                    )}
                  </div>
                </form>
              </div>
            </section>

            {/* Höger: liten info-panel om vald resa */}
            <section className="xl:col-span-1">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-4 py-4 sm:px-6 sm:py-6">
                <h2 className="text-sm font-semibold text-[#194C66]">
                  Info om resa
                </h2>
                {currentTrip ? (
                  <div className="mt-3 space-y-1 text-sm text-slate-700">
                    <div className="font-medium">{currentTrip.title}</div>
                    {currentTrip.year && (
                      <div>År: {currentTrip.year}</div>
                    )}
                    <div>
                      Status:{" "}
                      <span className="font-medium">
                        {currentTrip.published ? "Publicerad" : "Utkast"}
                      </span>
                    </div>
                    <div>
                      Pris från:{" "}
                      {currentTrip.price_from != null
                        ? money(currentTrip.price_from)
                        : "ej satt"}
                    </div>
                    <div>
                      Nästa avgång:{" "}
                      {currentTrip.next_date
                        ? new Date(
                            currentTrip.next_date
                          ).toLocaleDateString("sv-SE", {
                            year: "numeric",
                            month: "short",
                            day: "2-digit",
                          })
                        : "–"}
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    Välj en resa i listan till vänster för att se detaljer.
                  </p>
                )}
              </div>
            </section>
          </div>

          {/* Tabell med sparade priser */}
          <section className="mt-8">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
                <h2 className="text-sm font-semibold text-[#194C66]">
                  Priser för vald resa
                </h2>
                <div className="text-[11px] text-slate-500">
                  Visar rader ur <code>trip_ticket_pricing</code>.
                </div>
              </div>

              <div className="px-4 py-4 sm:px-6 sm:py-5">
                {!selectedTripId && (
                  <div className="text-sm text-slate-500">
                    Välj en resa ovan för att se sparade priser.
                  </div>
                )}

                {selectedTripId && pricingForCurrent.length === 0 && (
                  <div className="text-sm text-slate-500">
                    Inga priser sparade ännu för denna resa.
                  </div>
                )}

                {selectedTripId && pricingForCurrent.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                            Biljett-typ
                          </th>
                          <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                            Avgång
                          </th>
                          <th className="px-2 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                            Pris
                          </th>
                          <th className="px-2 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                            Åtgärder
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {pricingForCurrent.map((row) => {
                          const tt = ticketTypes.find(
                            (t) => t.id === row.ticket_type_id
                          );
                          const depLabel =
                            row.departure_date ||
                            "Standardpris (alla avgångar)";

                          return (
                            <tr
                              key={row.id}
                              className="border-b last:border-0 border-slate-100 hover:bg-slate-50/70 transition-colors"
                            >
                              <td className="px-2 py-2 align-middle">
                                {tt ? tt.name : `#${row.ticket_type_id}`}
                              </td>
                              <td className="px-2 py-2 align-middle text-slate-700">
                                {depLabel}
                              </td>
                              <td className="px-2 py-2 align-middle text-right font-medium text-slate-900">
                                {money(row.price)}
                              </td>
                              <td className="px-2 py-2 align-middle text-right">
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleEditRow(row)}
                                    className="text-xs font-medium text-[#194C66] hover:underline"
                                  >
                                    Redigera
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRow(row)}
                                    className="text-xs font-medium text-red-600 hover:underline"
                                  >
                                    Ta bort
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
