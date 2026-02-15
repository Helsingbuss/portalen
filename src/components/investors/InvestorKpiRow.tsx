import { useEffect, useState } from "react";

type Metrics = {
  monthlyRevenue: number;
  monthlyCosts: number;
  monthlyProfit: number;
};

type ApiResponse =
  | ({ ok: true } & Metrics)
  | { ok: false; error: string };

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(Math.round(amount || 0));
}

export default function InvestorKpiRow() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch("/api/investor/metrics");
        const json = (await res.json()) as ApiResponse;

        if (!res.ok || !json.ok) {
          throw new Error(
            !res.ok ? HTTP  : (json as any).error || "API-fel"
          );
        }

        setMetrics({
          monthlyRevenue: json.monthlyRevenue,
          monthlyCosts: json.monthlyCosts,
          monthlyProfit: json.monthlyProfit,
        });
      } catch (err: any) {
        console.error("[InvestorKpiRow] error:", err?.message || err);
        setError("Kunde inte hämta aktuella siffror.");
        setMetrics({ monthlyRevenue: 0, monthlyCosts: 0, monthlyProfit: 0 });
      } finally {
        setLoading(false);
      }
    };

    void fetchMetrics();
  }, []);

  const m =
    metrics ?? ({ monthlyRevenue: 0, monthlyCosts: 0, monthlyProfit: 0 } as Metrics);

  const cards = [
    {
      title: "Månatliga intäkter",
      value: formatCurrency(m.monthlyRevenue),
      subtitle: "Jämfört med föregående månad",
      trendLabel: "+0 %",
    },
    {
      title: "Månatliga kostnader",
      value: formatCurrency(m.monthlyCosts),
      subtitle: "Jämfört med föregående månad",
      trendLabel: "0 %",
    },
    {
      title: "Prognostiserad lönsamhet",
      value: formatCurrency(m.monthlyProfit),
      subtitle: "Prognos kommande 12 månader",
      trendLabel: m.monthlyProfit >= 0 ? "+0 %" : "0 %",
    },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-3 mb-6">
      {cards.map((card) => (
        <article
          key={card.title}
          className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold tracking-[0.15em] text-[#194C66] uppercase">
              {card.title}
            </h2>
            <span className="text-[11px] rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
              {card.trendLabel}
            </span>
          </div>

          <p className="mt-3 text-2xl font-semibold text-slate-900">
            {loading ? "…" : card.value}
          </p>

          <p className="mt-1 text-xs text-slate-500">{card.subtitle}</p>

          {error && (
            <p className="mt-2 text-[11px] text-amber-700">
              {error}
            </p>
          )}
        </article>
      ))}
    </section>
  );
}
