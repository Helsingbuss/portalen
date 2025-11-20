// src/pages/start.tsx
import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import AdminMenu from "@/components/AdminMenu";
import OffersBarChart, {
  type Series as ChartSeries,
  type StatsTotals,
} from "@/components/dashboard/OffersBarChart";
import UnansweredTable from "@/components/dashboard/UnansweredTable";
import GreetingNews from "@/components/dashboard/GreetingNews";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";

/* ---------- Typer för dashboard ---------- */
type StatsData = {
  range: string;
  series: ChartSeries;
  // dessa totals används bara om du vill ha något mer lokalt senare
  totals: {
    offer_answered: number;
    offer_unanswered: number;
    booking_in: number;
    booking_done: number;
  };
  apiTotals?: StatsTotals; // totals från API:t (per år)
};

type UnansweredRow = {
  id: string;
  offer_number: string | null;
  from: string | null;
  to: string | null;
  pax: number | null;
  type: string;
  departure_date: string | null;
  departure_time: string | null;
};

type Granularity = "week" | "month" | "ytd";

/* ---------- Tomma standardvärden ---------- */
const EMPTY_SERIES: ChartSeries = {
  weeks: [],
  offer_answered: [],
  offer_unanswered: [],
  booking_in: [],
  booking_done: [],
};
const EMPTY_STATS: StatsData = {
  range: "",
  series: EMPTY_SERIES,
  totals: {
    offer_answered: 0,
    offer_unanswered: 0,
    booking_in: 0,
    booking_done: 0,
  },
  apiTotals: undefined,
};

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function Start() {
  // Förvalt intervall exakt som i skissen
  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState("2025-11-01");
  const [to, setTo] = useState("2025-12-31");

  const [stats, setStats] = useState<StatsData>(EMPTY_STATS);
  const [unanswered, setUnanswered] = useState<UnansweredRow[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUnanswered, setLoadingUnanswered] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [granularity, setGranularity] = useState<Granularity>("week");
  const [filterOpen, setFilterOpen] = useState(false);

  async function loadStats(
    f: string = from,
    t: string = to,
    g: Granularity = granularity
  ) {
    try {
      setLoadingStats(true);
      setErrorMsg(null);

      const u = new URL("/api/dashboard/series", window.location.origin);
      u.searchParams.set("from", f);
      u.searchParams.set("to", t);
      u.searchParams.set("mode", g);

      const res = await fetch(u.toString());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // payload = serien + totals
      const payload = (await res.json()) as ChartSeries & {
        totals?: StatsTotals;
      };

      const s: ChartSeries = {
        weeks: payload.weeks ?? [],
        offer_answered: payload.offer_answered ?? [],
        offer_unanswered: payload.offer_unanswered ?? [],
        booking_in: payload.booking_in ?? [],
        booking_done: payload.booking_done ?? [],
      };

      const totalsCounts = {
        offer_answered: (s.offer_answered || []).reduce((a, b) => a + b, 0),
        offer_unanswered: (s.offer_unanswered || []).reduce((a, b) => a + b, 0),
        booking_in: (s.booking_in || []).reduce((a, b) => a + b, 0),
        booking_done: (s.booking_done || []).reduce((a, b) => a + b, 0),
      };

      setStats({
        range: `${f} – ${t}`,
        series: s || EMPTY_SERIES,
        totals: totalsCounts,
        apiTotals: payload.totals,
      });
    } catch (e: any) {
      setStats(EMPTY_STATS);
      setErrorMsg(e?.message || "Kunde inte hämta data.");
    } finally {
      setLoadingStats(false);
    }
  }

  async function loadUnanswered() {
    try {
      setLoadingUnanswered(true);
      const res = await fetch("/api/dashboard/unanswered").catch(() => null);
      if (res && res.ok) {
        const json = await res.json();
        setUnanswered(json?.rows ?? []);
      } else {
        setUnanswered([]);
      }
    } catch {
      setUnanswered([]);
    } finally {
      setLoadingUnanswered(false);
    }
  }

  useEffect(() => {
    // Laddar direkt med 2025-11-01 – 2025-12-31, per vecka
    loadStats("2025-11-01", "2025-12-31", "week");
    loadUnanswered();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyRange(e: React.FormEvent) {
    e.preventDefault();
    if (!from || !to) return;
    loadStats(from, to, granularity);
    setFilterOpen(false);
  }

  const handleGranularityChange = (g: Granularity) => {
    setGranularity(g);

    if (g === "ytd") {
      const year = today.getFullYear();
      const startOfYear = `${year}-01-01`;
      const todayStr = ymd(today);
      setFrom(startOfYear);
      setTo(todayStr);
    }
  };

  const displayName = "Andreas";

  return (
    <>
      <AdminMenu />
      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64 pt-16">
        <Header />

        <main className="px-6 pt-6 pb-6">
          {/* RAD 1: Vänster = diagram, Höger = nyheter */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow px-5 py-4 relative min-h-[420px] h-full flex flex-col">
                {/* Titel + filterikon + datumrad */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h2 className="text-[#194C66] font-semibold text-lg">
                      Offert – och bokningar
                    </h2>
                    <p className="text-xs text-[#6B7280] mt-1">
                      {stats.range || `${from} – ${to}`}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setFilterOpen((v) => !v)}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-gray-600 hover:bg-gray-50"
                    aria-label="Öppna filter"
                  >
                    <AdjustmentsHorizontalIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Felmeddelande om API-strul */}
                {errorMsg && (
                  <div className="mb-2 rounded-lg bg-red-50 border border-red-200 text-red-700 p-2 text-sm">
                    {errorMsg}
                  </div>
                )}

                {/* Diagram */}
                {loadingStats ? (
                  <div className="flex-1 flex items-center justify-center text-[#194C66]/70">
                    Laddar…
                  </div>
                ) : stats.series.weeks.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-[#194C66]/60">
                    Inga data att visa ännu
                  </div>
                ) : (
                  <OffersBarChart
                    series={stats.series}
                    totals={stats.apiTotals}
                  />
                )}

                {/* Filter-panel */}
                {filterOpen && (
                  <form
                    onSubmit={applyRange}
                    className="absolute right-5 top-14 z-20 w-[340px] rounded-xl border border-gray-200 bg-white shadow-xl"
                  >
                    <div className="border-b border-gray-100 px-4 py-3 text-sm font-medium text-[#111827]">
                      Filter
                    </div>

                    <div className="px-4 py-3 space-y-3 text-sm text-[#111827]">
                      {/* Period-typ */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            className="h-4 w-4"
                            checked={granularity === "week"}
                            onChange={() => handleGranularityChange("week")}
                          />
                          <span>Per vecka</span>
                        </label>

                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            className="h-4 w-4"
                            checked={granularity === "month"}
                            onChange={() => handleGranularityChange("month")}
                          />
                          <span>Per månad</span>
                        </label>

                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            className="h-4 w-4"
                            checked={granularity === "ytd"}
                            onChange={() => handleGranularityChange("ytd")}
                          />
                          <span>Hittills i år</span>
                        </label>
                      </div>

                      {/* Datumfält */}
                      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                        <div>
                          <span className="block text-xs text-[#6B7280] mb-1">
                            Från
                          </span>
                          <input
                            type="date"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                          />
                        </div>
                        <span className="text-xs text-gray-500 mt-5 text-center">
                          till
                        </span>
                        <div>
                          <span className="block text-xs text-[#6B7280] mb-1">
                            Till
                          </span>
                          <input
                            type="date"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 border-t border-gray-100 px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => setFilterOpen(false)}
                        className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Stäng
                      </button>
                      <button
                        type="submit"
                        className="rounded-full bg-[#194C66] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#163a4c]"
                      >
                        Visa
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </section>

            <aside className="space-y-6">
              <GreetingNews
                name={displayName}
                role="admin"
                heightClass="h-[420px]"
                items={[
                  {
                    title: "Nya betalningsvillkor för privatpersoner",
                    href: "#",
                  },
                  { title: "Ny hemsida lanserad", href: "#" },
                  { title: "Nya resor ligger ute på hemsidan", href: "#" },
                  { title: "Välkommen till Helsingbuss Portal", href: "#" },
                ]}
              />
            </aside>
          </div>

          {/* RAD 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <section className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow">
                {loadingUnanswered ? (
                  <div className="p-6 text-[#194C66]/70">Laddar…</div>
                ) : (
                  <UnansweredTable rows={unanswered} />
                )}
              </div>
            </section>

            <aside>
              <div className="bg-white rounded-xl shadow p-4 h-[478px]">
                <div className="text-[#194C66] font-semibold mb-2">
                  Sållda biljetter, antal bokade och intäkter
                </div>
                <div className="text-sm text-[#194C66]/70 space-y-2">
                  <p>
                    I nästa steg kopplar vi på integration mot Visma eEkonomi /
                    annat ekonomisystem och visar staplar för periodens
                    resultat.
                  </p>
                  <p>
                    Här kommer du kunna se samma typ av stapeldiagram som i
                    skissen, med länkar vidare till detaljerade rapporter under{" "}
                    <strong>Reports</strong>.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </>
  );
}
