// src/pages/admin/pricing/index.tsx
import { useEffect, useMemo, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type TripOption = {
  id: string;
  title: string;
  year?: number | null;
};

type DepartureOption = {
  trip_id: string;
  date: string; // YYYY-MM-DD
};

type TicketType = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  kind: "ticket" | "addon" | string;
  sort_order: number;
  is_active: boolean;
};

type ExistingPrice = {
  id: string;
  ticket_type_id: string;
  price: number;
  currency: string;
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[13px] font-medium text-[#194C66]/80 mb-1">
      {children}
    </div>
  );
}

function Help({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[12px] text-[#194C66]/60 mt-1">{children}</div>
  );
}

function formatDate(date: string) {
  if (!date) return "";
  const d = new Date(date + "T00:00:00");
  if (isNaN(d.getTime())) return date;
  return d.toLocaleDateString("sv-SE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function PricingPage() {
  const [initLoading, setInitLoading] = useState(true);
  const [trips, setTrips] = useState<TripOption[]>([]);
  const [departures, setDepartures] = useState<DepartureOption[]>([]);

  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");

  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});

  const [loadingPrices, setLoadingPrices] = useState(false);
  const [saving, setSaving] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Hämta alla trips + avgångar vid start
  useEffect(() => {
    (async () => {
      try {
        setInitLoading(true);
        setErr(null);
        setMsg(null);

        const r = await fetch("/api/pricing/init");
        const j = await r.json();
        if (!r.ok || j.ok === false) {
          throw new Error(j?.error || "Kunde inte hämta grunddata.");
        }

        const tripsData: TripOption[] = j.trips || [];
        const depData: DepartureOption[] = j.departures || [];

        setTrips(tripsData);
        setDepartures(depData);

        if (tripsData.length > 0) {
          const firstTripId = tripsData[0].id;
          setSelectedTripId(firstTripId);

          const depsForTrip = depData.filter(
            (d) => d.trip_id === firstTripId && d.date
          );
          if (depsForTrip.length > 0) {
            setSelectedDate(depsForTrip[0].date);
          }
        }
      } catch (e: any) {
        setErr(e?.message || "Tekniskt fel vid hämtning.");
      } finally {
        setInitLoading(false);
      }
    })();
  }, []);

  // Filtrerade avgångar för vald resa
  const departuresForTrip = useMemo(
    () =>
      departures
        .filter((d) => d.trip_id === selectedTripId && d.date)
        .sort((a, b) => (a.date < b.date ? -1 : 1)),
    [departures, selectedTripId]
  );

  // Hämta biljetttyper + priser när trip + datum ändras
  useEffect(() => {
    if (!selectedTripId || !selectedDate) {
      setTicketTypes([]);
      setPriceInputs({});
      return;
    }

    (async () => {
      try {
        setLoadingPrices(true);
        setErr(null);
        setMsg(null);

        const params = new URLSearchParams({
          trip_id: selectedTripId,
          departure_date: selectedDate,
        });

        const r = await fetch(`/api/pricing/get?${params.toString()}`);
        const j = await r.json();

        if (!r.ok || j.ok === false) {
          throw new Error(j?.error || "Kunde inte hämta prissättning.");
        }

        const tt: TicketType[] = j.ticket_types || [];
        const prices: ExistingPrice[] = j.prices || [];

        const map: Record<string, string> = {};
        for (const t of tt) {
          const found = prices.find((p) => p.ticket_type_id === t.id);
          if (found && typeof found.price === "number") {
            map[t.id] = String(found.price);
          } else {
            map[t.id] = "";
          }
        }

        setTicketTypes(tt);
        setPriceInputs(map);
      } catch (e: any) {
        setErr(e?.message || "Tekniskt fel vid hämtning av priser.");
        setTicketTypes([]);
        setPriceInputs({});
      } finally {
        setLoadingPrices(false);
      }
    })();
  }, [selectedTripId, selectedDate]);

  function onChangePrice(ticketTypeId: string, value: string) {
    // Tillåt bara siffror
    const cleaned = value.replace(/[^\d]/g, "");
    setPriceInputs((prev) => ({ ...prev, [ticketTypeId]: cleaned }));
  }

  async function onSave() {
    if (!selectedTripId || !selectedDate) {
      setErr("Välj både resa och avgång innan du sparar.");
      return;
    }

    try {
      setSaving(true);
      setErr(null);
      setMsg(null);

      const pricesPayload = ticketTypes
        .map((t) => {
          const raw = (priceInputs[t.id] || "").trim();
          if (!raw) return null;
          const n = Number(raw);
          if (!Number.isFinite(n) || n <= 0) return null;
          return {
            ticket_type_id: t.id,
            price: Math.round(n),
          };
        })
        .filter(Boolean) as { ticket_type_id: string; price: number }[];

      const body = {
        trip_id: selectedTripId,
        departure_date: selectedDate,
        prices: pricesPayload,
      };

      const r = await fetch("/api/pricing/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const j = await r.json();
      if (!r.ok || j.ok === false) {
        throw new Error(j?.error || "Kunde inte spara priser.");
      }

      setMsg("Priser sparade.");
    } catch (e: any) {
      setErr(e?.message || "Tekniskt fel vid sparande.");
    } finally {
      setSaving(false);
    }
  }

  const currentTrip = trips.find((t) => t.id === selectedTripId) || null;

  return (
    <>
      <AdminMenu />
      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="px-6 pb-16 pt-14 lg:pt-20">
          {/* Topprad */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-[#194C66]">
                Prissättning
              </h1>
              <p className="text-sm text-slate-600">
                Här sätter du priser per resa, avgångsdatum och biljetttyp.
              </p>
            </div>
            {initLoading && (
              <div className="text-[12px] text-slate-500">
                Laddar grunddata…
              </div>
            )}
          </div>

          {err && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          )}
          {msg && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {msg}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
            {/* Vänster: val av resa + avgång */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200/70">
              <div className="px-4 sm:px-5 py-3 border-b">
                <h2 className="text-sm font-semibold tracking-wide text-[#194C66]">
                  Välj resa & avgång
                </h2>
                <p className="text-[12px] text-slate-500 mt-1">
                  Välj först resa, sedan avgångsdatum. Till höger sätter du
                  priser för biljetttyper.
                </p>
              </div>
              <div className="p-4 sm:p-5 space-y-4">
                <div>
                  <FieldLabel>Resa</FieldLabel>
                  <select
                    className="border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                    value={selectedTripId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedTripId(id);
                      // Välj första avgång för denna resa
                      const depsForTrip = departures
                        .filter((d) => d.trip_id === id && d.date)
                        .sort((a, b) => (a.date < b.date ? -1 : 1));
                      setSelectedDate(depsForTrip[0]?.date || "");
                    }}
                  >
                    {trips.length === 0 && (
                      <option value="">Inga resor ännu</option>
                    )}
                    {trips.length > 0 && (
                      <>
                        <option value="">Välj resa…</option>
                        {trips.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                            {t.year ? ` (${t.year})` : ""}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  <Help>
                    Listan hämtas från tabellen <b>trips</b>. Resor utan
                    avgångar visas också.
                  </Help>
                </div>

                <div>
                  <FieldLabel>Avgångsdatum</FieldLabel>
                  <select
                    className="border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    disabled={!selectedTripId || departuresForTrip.length === 0}
                  >
                    {!selectedTripId && (
                      <option value="">Välj en resa först</option>
                    )}
                    {selectedTripId && departuresForTrip.length === 0 && (
                      <option value="">
                        Ingen avgång hittad för denna resa
                      </option>
                    )}
                    {selectedTripId && departuresForTrip.length > 0 && (
                      <>
                        <option value="">Välj avgång…</option>
                        {departuresForTrip.map((d) => (
                          <option key={d.trip_id + d.date} value={d.date}>
                            {formatDate(d.date)}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  <Help>
                    Datum hämtas från tabellen <b>trip_departures</b>.
                  </Help>
                </div>

                {currentTrip && selectedDate && (
                  <div className="mt-2 rounded-xl bg-slate-50 px-3 py-3 text-[13px] text-slate-700">
                    <div className="font-semibold text-[#194C66] mb-1">
                      Aktiv kombination
                    </div>
                    <div>{currentTrip.title}</div>
                    <div className="text-[12px] text-slate-600">
                      Avgång: {formatDate(selectedDate)}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Höger: prislista */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200/70">
              <div className="px-4 sm:px-5 py-3 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold tracking-wide text-[#194C66]">
                    Priser per biljetttyp
                  </h2>
                  <p className="text-[12px] text-slate-500 mt-1">
                    Lämna tomt för biljetttyper som inte ska erbjudas på
                    den här avgången.
                  </p>
                </div>
                {loadingPrices && (
                  <span className="text-[12px] text-slate-500">
                    Laddar priser…
                  </span>
                )}
              </div>

              {!selectedTripId || !selectedDate ? (
                <div className="p-5 text-sm text-slate-500">
                  Välj först en resa och en avgång för att kunna sätta
                  priser.
                </div>
              ) : ticketTypes.length === 0 && !loadingPrices ? (
                <div className="p-5 text-sm text-slate-500">
                  Inga biljetttyper hittades. Skapa minst en under{" "}
                  <b>Biljetttyper</b> först.
                </div>
              ) : (
                <div className="p-4 sm:p-5">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-slate-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                            Kod
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                            Namn
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                            Typ
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                            Pris (SEK)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {ticketTypes.map((t) => (
                          <tr
                            key={t.id}
                            className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors"
                          >
                            <td className="px-4 py-3 align-top font-mono text-xs text-slate-700">
                              {t.code}
                            </td>
                            <td className="px-4 py-3 align-top text-slate-900">
                              <div className="font-medium">{t.name}</div>
                              {t.description && (
                                <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                                  {t.description}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 align-top text-slate-700">
                              {t.kind === "addon"
                                ? "Tillägg"
                                : "Vanlig biljett"}
                            </td>
                            <td className="px-4 py-3 align-top">
                              <input
                                type="number"
                                min={0}
                                className="border rounded-xl px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#194C66]/30"
                                placeholder="t.ex. 295"
                                value={priceInputs[t.id] ?? ""}
                                onChange={(e) =>
                                  onChangePrice(t.id, e.target.value)
                                }
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={onSave}
                      disabled={saving || loadingPrices}
                      className="inline-flex items-center rounded-[24px] bg-[#194C66] px-5 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-60"
                    >
                      {saving ? "Sparar…" : "Spara priser för avgången"}
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
