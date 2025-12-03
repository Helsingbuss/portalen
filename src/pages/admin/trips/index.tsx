// src/pages/admin/pricing/index.tsx
import { useEffect, useMemo, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type RawDeparture = {
  dep_date?: string;
  depart_date?: string;
  date?: string;
  day?: string;
  when?: string;
  dep_time?: string;
  time?: string;
  line_name?: string;
  line?: string;
};

type Trip = {
  id: string;
  title: string;
  year: number | null;
  slug?: string | null;
  published: boolean;
  departures?: any;
};

type TicketType = {
  id: number;
  name: string;
  code?: string | null;
};

type PricingRow = {
  id: number;
  trip_id: string;
  ticket_type_id: number;
  departure_date: string | null;
  price: number;
  currency: string;
};

type LoadResponse = {
  ok: boolean;
  trips: Trip[];
  ticket_types: TicketType[];
  pricing: PricingRow[];
  error?: string;
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
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [pricing, setPricing] = useState<PricingRow[]>([]);

  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [selectedTicketTypeId, setSelectedTicketTypeId] =
    useState<number | null>(null);
  const [selectedDepartureDate, setSelectedDepartureDate] =
    useState<string>(""); // tom = standardpris
  const [priceInput, setPriceInput] = useState<string>("");
  const [editingId, setEditingId] = useState<number | null>(null);

  // ------------------------------------------------
  // Ladda data
  // ------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/admin/pricing/load");
        const json: LoadResponse = await res.json();

        if (!res.ok || !json.ok) {
          throw new Error(json.error || "Kunde inte läsa prissättning.");
        }

        if (cancelled) return;

        setTrips(json.trips || []);
        setTicketTypes(json.ticket_types || []);
        setPricing(json.pricing || []);

        if (json.trips && json.trips.length && !selectedTripId) {
          setSelectedTripId(json.trips[0].id);
        }
        if (
          json.ticket_types &&
          json.ticket_types.length &&
          selectedTicketTypeId == null
        ) {
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

  // ------------------------------------------------
  // Härledning av nuvarande resa och dess avgångsdatum
  // ------------------------------------------------
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

  const departuresForTrip = useMemo(() => {
    if (!selectedTripId) return [];
    const t = trips.find((x) => x.id === selectedTripId);
    if (!t || !t.departures) return [];

    let raw: RawDeparture[] = [];

    if (Array.isArray(t.departures)) {
      raw = t.departures as RawDeparture[];
    } else if (typeof t.departures === "string") {
      try {
        const parsed = JSON.parse(t.departures);
        if (Array.isArray(parsed)) raw = parsed as RawDeparture[];
      } catch {
        // ogiltig JSON -> ignorera
        return [];
      }
    } else {
      return [];
    }

    const unique = new Set<string>();
    const out: string[] = [];

    for (const r of raw) {
      const rawDate =
        (r.dep_date ||
          r.depart_date ||
          r.date ||
          r.day ||
          r.when ||
          "") as string;
      const d = String(rawDate).slice(0, 10);
      if (!d) continue;
      if (/^\d{4}-\d{2}-\d{2}$/.test(d) && !unique.has(d)) {
        unique.add(d);
        out.push(d);
      }
    }

    out.sort();
    return out;
  }, [trips, selectedTripId]);

  const pricingForCurrent = useMemo(() => {
    if (!selectedTripId) return [];
    return pricing
      .filter((p) => p.trip_id === selectedTripId)
      .sort((a, b) => {
        const dA = a.departure_date || "";
        const dB = b.departure_date || "";
        if (dA === dB) return a.ticket_type_id - b.ticket_type_id;
        return dA.localeCompare(dB);
      });
  }, [pricing, selectedTripId]);

  // ------------------------------------------------
  // Spara pris
  // ------------------------------------------------
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTripId) {
      setError("Välj en resa.");
      return;
    }
    if (selectedTicketTypeId == null) {
      setError("Välj en biljett-typ.");
      return;
    }
    const price = Number(priceInput.replace(/[^\d]/g, ""));
    if (!price || isNaN(price)) {
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
        departure_date: selectedDepartureDate || null,
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

      setEditingId(saved.id);
      setMessage("Pris sparat.");
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Tekniskt fel vid sparande.");
    } finally {
      setSaving(false);
    }
  }

  // ------------------------------------------------
  // Redigera / Ta bort
  // ------------------------------------------------
  function handleEditRow(row: PricingRow) {
    setSelectedTripId(row.trip_id);
    setSelectedTicketTypeId(row.ticket_type_id);
    setSelectedDepartureDate(row.departure_date || "");
    setPriceInput(String(row.price ?? ""));
    setEditingId(row.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDeleteRow(row: PricingRow) {
    if (!window.confirm("Vill du ta bort det här priset?")) return;

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
        throw new Error(json.error || "Kunde inte ta bort priset.");
      }

      setPricing((prev) => prev.filter((p) => p.id !== row.id));
      if (editingId === row.id) {
        setEditingId(null);
        setPriceInput("");
        setSelectedDepartureDate("");
      }
      setMessage("Pris borttaget.");
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Tekniskt fel vid borttagning.");
    } finally {
      setSaving(false);
    }
  }

  // ------------------------------------------------
  // UI
  // ------------------------------------------------
  return (
    <>
      <AdminMenu />
      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />
        <main className="px-6 pb-16 pt-14 lg:pt-20">
          <div className="max-w-6xl mx-auto space-y-6">
            <div>
              <h1 className="text-xl font-semibold text-[#194C66]">
                Prissättning – biljetter
              </h1>
              <p className="text-sm text-slate-600">
                Sätt priser per resa, avgångsdatum och biljett-typ. Den här
                sidan används av kassan och bokningsformulären.
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {message && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {message}
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(260px,1.3fr)]">
              {/* Vänster: formulär */}
              <form
                onSubmit={handleSave}
                className="bg-white rounded-2xl shadow-sm border border-slate-200"
              >
                <div className="border-b border-slate-200 px-5 py-4">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Skapa / ändra pris
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Välj resa, biljett-typ och – om du vill – ett specifikt
                    avgångsdatum. Lämnar du datumet tomt blir det ett{" "}
                    <b>standardpris</b> som gäller alla avgångar.
                  </p>
                </div>

                <div className="px-5 pt-4 pb-5 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Resa */}
                    <div>
                      <div className="text-xs font-medium text-[#194C66]/80 mb-1">
                        Resa
                      </div>
                      <select
                        className="border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                        value={selectedTripId}
                        onChange={(e) => {
                          setSelectedTripId(e.target.value);
                          setSelectedDepartureDate("");
                        }}
                      >
                        {!selectedTripId && <option value="">Välj resa…</option>}
                        {tripOptions.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title} {t.year ? `(${t.year})` : ""}
                          </option>
                        ))}
                      </select>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Resor hämtas från tabellen <code>trips</code>.
                      </div>
                    </div>

                    {/* Biljett-typ */}
                    <div>
                      <div className="text-xs font-medium text-[#194C66]/80 mb-1">
                        Biljett-typ
                      </div>
                      <select
                        className="border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                        value={selectedTicketTypeId ?? ""}
                        onChange={(e) =>
                          setSelectedTicketTypeId(
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                      >
                        {ticketTypes.length === 0 && (
                          <option value="">Inga biljett-typer upplagda</option>
                        )}
                        {ticketTypes.length > 0 && (
                          <option value="">Välj biljett-typ…</option>
                        )}
                        {ticketTypes.map((tt) => (
                          <option key={tt.id} value={tt.id}>
                            {tt.name}
                          </option>
                        ))}
                      </select>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Biljett-typer hämtas från tabellen{" "}
                        <code>ticket_types</code>.
                      </div>
                    </div>
                  </div>

                  {/* Avgång + pris */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="text-xs font-medium text-[#194C66]/80 mb-1">
                        Avgångsdatum
                      </div>
                      <select
                        className="border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                        value={selectedDepartureDate}
                        onChange={(e) =>
                          setSelectedDepartureDate(e.target.value)
                        }
                      >
                        <option value="">Standardpris – gäller alla avgångar</option>
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
                      <div className="text-[11px] text-slate-500 mt-1">
                        Datum hämtas från fältet <code>trips.departures</code>.
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-[#194C66]/80 mb-1">
                        Pris (SEK)
                      </div>
                      <input
                        className="border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                        placeholder="t.ex. 295"
                        inputMode="numeric"
                        value={priceInput}
                        onChange={(e) =>
                          setPriceInput(e.target.value.replace(/[^\d]/g, ""))
                        }
                      />
                      <div className="text-[11px] text-slate-500 mt-1">
                        Endast hela kronor. Valutan sparas som SEK.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-5 py-2 rounded-[999px] bg-[#194C66] text-white text-sm disabled:opacity-60"
                    >
                      {saving ? "Sparar…" : "Spara pris"}
                    </button>
                    {currentTrip && (
                      <div className="text-xs text-slate-600">
                        Vald resa: <b>{currentTrip.title}</b>
                      </div>
                    )}
                  </div>
                </div>
              </form>

              {/* Höger: info-kort */}
              <aside className="bg-white rounded-2xl shadow-sm border border-slate-200 px-5 py-4 space-y-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  Info om resa
                </h2>
                {!currentTrip ? (
                  <p className="text-xs text-slate-500">
                    Välj en resa i listan till vänster för att se detaljer.
                  </p>
                ) : (
                  <>
                    <div className="text-sm font-medium text-slate-900">
                      {currentTrip.title}
                    </div>
                    {currentTrip.year && (
                      <div className="text-xs text-slate-500">
                        År: {currentTrip.year}
                      </div>
                    )}
                    <div className="text-xs text-slate-500">
                      Status:{" "}
                      <span className="font-medium">
                        {currentTrip.published ? "Publicerad" : "Utkast"}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Antal datum i turlistan:{" "}
                      <span className="font-medium">
                        {departuresForTrip.length}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Antal prissatta rader:{" "}
                      <span className="font-medium">
                        {pricingForCurrent.length}
                      </span>
                    </div>
                  </>
                )}
              </aside>
            </div>

            {/* Tabell med befintliga priser */}
            <section className="bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                <h2 className="text-sm font-semibold text-[#194C66]">
                  Priser för vald resa
                </h2>
                <div className="text-[11px] text-slate-500">
                  Visar rader ur <code>trip_ticket_pricing</code>.
                </div>
              </div>

              <div className="px-5 pb-4">
                {!selectedTripId && (
                  <div className="py-4 text-sm text-slate-500">
                    Välj en resa ovan för att se sparade priser.
                  </div>
                )}

                {selectedTripId && pricingForCurrent.length === 0 && (
                  <div className="py-4 text-sm text-slate-500">
                    Inga priser sparade ännu för denna resa.
                  </div>
                )}

                {selectedTripId && pricingForCurrent.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-2 py-2 text-left text-xs font-medium text-slate-600">
                            Biljett-typ
                          </th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-slate-600">
                            Avgång
                          </th>
                          <th className="px-2 py-2 text-right text-xs font-medium text-slate-600">
                            Pris
                          </th>
                          <th className="px-2 py-2 text-right text-xs font-medium text-slate-600">
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
                            row.departure_date || "Standardpris (alla avgångar)";
                          const isEditing = editingId === row.id;

                          return (
                            <tr
                              key={row.id}
                              className={`border-b last:border-0 ${
                                isEditing ? "bg-amber-50" : ""
                              }`}
                            >
                              <td className="px-2 py-2">
                                {tt ? tt.name : `#${row.ticket_type_id}`}
                              </td>
                              <td className="px-2 py-2">{depLabel}</td>
                              <td className="px-2 py-2 text-right">
                                {money(row.price)}
                              </td>
                              <td className="px-2 py-2 text-right space-x-2">
                                <button
                                  type="button"
                                  onClick={() => handleEditRow(row)}
                                  className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                                >
                                  Redigera
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRow(row)}
                                  className="inline-flex items-center rounded-full border border-red-200 px-3 py-1 text-[11px] font-medium text-red-700 hover:bg-red-50"
                                >
                                  Ta bort
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
