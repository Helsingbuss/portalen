// src/pages/admin/pricing/index.tsx
import { useEffect, useMemo, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Trip = {
  id: string;
  title: string;
  year: number | null;
  slug?: string | null;
  published: boolean;
};

type Departure = {
  id: string;
  trip_id: string;
  depart_date: string | null;
  return_date?: string | null;
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
  valid_from?: string | null;
  valid_until?: string | null;
};

type LoadResponse = {
  ok: boolean;
  trips: Trip[];
  ticket_types: TicketType[];
  departures: Departure[];
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
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [pricing, setPricing] = useState<PricingRow[]>([]);

  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [selectedTicketTypeId, setSelectedTicketTypeId] =
    useState<number | null>(null);
  const [selectedDepartureDate, setSelectedDepartureDate] =
    useState<string>(""); // tom = standardpris

  const [priceInput, setPriceInput] = useState<string>("");
  const [validFrom, setValidFrom] = useState<string>("");
  const [validUntil, setValidUntil] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/admin/pricing/load");
        const json: LoadResponse = await res.json();
        if (!json.ok) throw new Error(json.error || "Kunde inte läsa prissättning.");

        if (cancelled) return;

        setTrips(json.trips || []);
        setDepartures(json.departures || []);
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
    const rows = departures.filter((d) => d.trip_id === selectedTripId);
    const uniqueDates = new Set<string>();
    const out: string[] = [];

    for (const row of rows) {
      const raw = row.depart_date || null;
      if (!raw) continue;
      const s = String(raw).slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(s) && !uniqueDates.has(s)) {
        uniqueDates.add(s);
        out.push(s);
      }
    }

    out.sort();
    return out;
  }, [departures, selectedTripId]);

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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

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

      const body = {
        trip_id: selectedTripId,
        ticket_type_id: selectedTicketTypeId,
        departure_date: selectedDepartureDate || null,
        price,
        valid_from: validFrom || null,
        valid_until: validUntil || null,
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

  return (
    <>
      <AdminMenu />
      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />
        <main className="px-6 pb-16 pt-14 lg:pt-20">
          <div className="max-w-5xl mx-auto space-y-8">
            <h1 className="text-xl font-semibold text-[#194C66]">
              Prissättning – biljetter
            </h1>
            <p className="text-sm text-slate-600">
              Här kopplar du <b>biljett-typer</b> till en <b>resa</b> och – om du
              vill – till ett specifikt <b>avgångsdatum</b>. Lämnar du datumet
              tomt blir det ett <i>standardpris</i> som gäller alla avgångar.
            </p>

            <form
              onSubmit={handleSave}
              className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-6 space-y-4"
            >
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-[#194C66]/80 mb-1">
                    Resa
                  </div>
                  <select
                    className="border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                    value={selectedTripId}
                    onChange={(e) => setSelectedTripId(e.target.value)}
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

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-[#194C66]/80 mb-1">
                    Avgångsdatum
                  </div>
                  <select
                    className="border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                    value={selectedDepartureDate}
                    onChange={(e) => setSelectedDepartureDate(e.target.value)}
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
                  <div className="text-[11px] text-slate-500 mt-1">
                    Datum hämtas från tabellen <code>trip_departures</code>.
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
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-[#194C66]/80 mb-1">
                    Gäller från (valfritt)
                  </div>
                  <input
                    type="date"
                    className="border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                  />
                </div>
                <div>
                  <div className="text-xs font-medium text-[#194C66]/80 mb-1">
                    Gäller till (Early Bird t.o.m.)
                  </div>
                  <input
                    type="date"
                    className="border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                  />
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

              {error && (
                <div className="mt-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-sm">
                  {error}
                </div>
              )}
              {message && (
                <div className="mt-3 bg-green-50 border border-green-200 text-green-700 rounded-xl px-3 py-2 text-sm">
                  {message}
                </div>
              )}
            </form>

            <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-[#194C66]">
                  Priser för vald resa
                </h2>
                <div className="text-[11px] text-slate-500">
                  Visar rader ur <code>trip_ticket_pricing</code>.
                </div>
              </div>

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
                      <tr className="border-b bg-slate-50">
                        <th className="text-left px-2 py-2 font-medium text-slate-600">
                          Biljett-typ
                        </th>
                        <th className="text-left px-2 py-2 font-medium text-slate-600">
                          Avgång
                        </th>
                        <th className="text-left px-2 py-2 font-medium text-slate-600">
                          Gäller
                        </th>
                        <th className="text-right px-2 py-2 font-medium text-slate-600">
                          Pris
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
                        const periodLabel =
                          row.valid_from || row.valid_until
                            ? `${row.valid_from || "–"} → ${
                                row.valid_until || "tills vidare"
                              }`
                            : "Tills vidare";

                        return (
                          <tr key={row.id} className="border-b last:border-0">
                            <td className="px-2 py-2">
                              {tt ? tt.name : `#${row.ticket_type_id}`}
                            </td>
                            <td className="px-2 py-2">{depLabel}</td>
                            <td className="px-2 py-2">{periodLabel}</td>
                            <td className="px-2 py-2 text-right">
                              {money(row.price)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
