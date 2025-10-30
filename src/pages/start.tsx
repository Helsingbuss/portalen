// src/pages/start.tsx
import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import AdminMenu from "@/components/AdminMenu";
import OffersBarChart, { type Series as ChartSeries } from "@/components/dashboard/OffersBarChart";
import UnansweredTable from "@/components/dashboard/UnansweredTable";
import GreetingNews from "@/components/dashboard/GreetingNews";

/* ---------- Typer ---------- */
type StatsData = {
  range: string;
  series: ChartSeries;
  totals: {
    offer_answered: number;
    offer_unanswered: number;
    booking_in: number;
    booking_done: number;
  };
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
  totals: { offer_answered: 0, offer_unanswered: 0, booking_in: 0, booking_done: 0 },
};

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function Start() {
  // Förvalt intervall: Från = idag, Till = 2025-12-31 (enligt din önskan)
  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState(ymd(today));
  const [to, setTo] = useState("2025-12-31");

  const [stats, setStats] = useState<StatsData>(EMPTY_STATS);
  const [unanswered, setUnanswered] = useState<UnansweredRow[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUnanswered, setLoadingUnanswered] = useState(true);

  async function loadStats(f = from, t = to) {
    try {
      setLoadingStats(true);
      const url = `/api/dashboard/stats?from=${encodeURIComponent(f)}&to=${encodeURIComponent(t)}`;
      const res = await fetch(url);
      const json = (await res.json()) as StatsData;
      setStats({
        range: json?.range ?? "",
        series: json?.series ?? EMPTY_SERIES,
        totals: json?.totals ?? EMPTY_STATS.totals,
      });
    } catch {
      setStats(EMPTY_STATS);
    } finally {
      setLoadingStats(false);
    }
  }

  async function loadUnanswered() {
    try {
      setLoadingUnanswered(true);
      const res = await fetch("/api/dashboard/unanswered");
      const json = await res.json();
      setUnanswered(json?.rows ?? []);
    } catch {
      setUnanswered([]);
    } finally {
      setLoadingUnanswered(false);
    }
  }

  useEffect(() => {
    loadStats();
    loadUnanswered();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyRange(e: React.FormEvent) {
    e.preventDefault();
    if (!from || !to) return;
    loadStats(from, to);
  }

  // TODO (valfritt): hämta namn från Supabase-profiler
  // ex: const displayName = profile?.first_name ?? "Andreas";
  const displayName = "Andreas";

  return (
    <>
      <AdminMenu />
      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="p-6">
          <h1 className="text-xl font-semibold text-[#194C66] mb-4">Översikt</h1>

          {/* RAD 1: Vänster = diagram (med rubrik + datumintervall), Höger = nyheter */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow p-4">
                {/* Rubrik */}
                <h2 className="text-[#194C66] font-semibold text-lg mb-2">
                  Offerter och bokningar
                </h2>

                {/* Datumintervall under rubrik */}
                <form onSubmit={applyRange} className="flex flex-wrap items-end gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-[#194C66]/70 mb-1">Från</label>
                    <input
                      type="date"
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                      className="border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#194C66]/70 mb-1">Till</label>
                    <input
                      type="date"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      className="border rounded px-2 py-1 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    className="h-8 px-3 rounded bg-[#194C66] text-white text-sm"
                  >
                    Visa
                  </button>

                  {/* vald period till höger */}
                  {stats.range && (
                    <span className="ml-auto text-sm text-[#194C66]/70">
                      {stats.range}
                    </span>
                  )}
                </form>

                {/* Diagram */}
                {loadingStats ? (
                  <div className="h-[320px] flex items-center justify-center text-[#194C66]/70">
                    Laddar…
                  </div>
                ) : stats.series.weeks.length === 0 ? (
                  <div className="h-[320px] flex items-center justify-center text-[#194C66]/60">
                    Inga data att visa ännu
                  </div>
                ) : (
                  <OffersBarChart series={stats.series} />
                )}
              </div>
            </section>

            <aside className="space-y-6">
              <GreetingNews
                name={displayName}
                role="admin"
                heightClass="h-[420px]"
                items={[
                  { title: "Nya betalningsvillkor för privatpersoner", href: "#" },
                  { title: "Ny hemsida lanserad", href: "#" },
                  { title: "Nya resor ligger ute på hemsidan", href: "#" },
                  { title: "Välkommen till Helsingbuss Portal", href: "#" },
                ]}
              />
            </aside>
          </div>

          {/* RAD 2: Vänster = Obesvarade, Höger = Visma placeholder */}
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
                  Intäkter, kostnader och resultat
                </div>
                <div className="text-sm text-[#194C66]/70">
                  <p>Visma eEkonomi-integration kommer i nästa steg.</p>
                  <p>
                    Här lägger vi en modul som hämtar periodiserade värden via API och visar
                    stapeldiagram – precis som i din skiss.
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