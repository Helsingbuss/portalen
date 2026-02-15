import type { GetServerSideProps, NextPage } from "next";
import InvestorLayout from "@/components/invest/InvestorLayout";
import InvestorTopStats from "@/components/invest/InvestorTopStats";
import InvestorKpiRow from "@/components/investors/InvestorKpiRow";
import supabase from "@/lib/supabaseAdmin";

type Kpi = {
  revenue: number;
  costs: number;
  profit: number;
  revenueChange: number;
  costsChange: number;
  profitChange: number;
};

type Props = {
  kpi: Kpi | null;
};

const CONFIRMED_STATUSES = [
  "godkänd",
  "godkand",
  "bokningsbekräftelse",
  "bokningsbekraftelse",
];

const InvestorOverviewPage: NextPage<Props> = ({ kpi }) => {
  return (
    <InvestorLayout title="Investeraröversikt">
      <h1 className="text-2xl font-semibold text-[#0f172a]">
        Investeraröversikt
      </h1>

      <div className="mt-6">
        <InvestorTopStats
          revenue={kpi?.revenue ?? 0}
          revenueChange={kpi?.revenueChange ?? 0}
          costs={kpi?.costs ?? 0}
          costsChange={kpi?.costsChange ?? 0}
          profit={kpi?.profit ?? 0}
          profitChange={kpi?.profitChange ?? 0}
        />
      </div>

      <section className="mt-8 rounded-2xl bg-white border border-slate-200 px-6 py-5 shadow-sm">
        <h2 className="text-sm font-semibold tracking-[0.16em] text-[#194C66]/80 uppercase">
          Nästa steg i utvecklingen
        </h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Koppla sidan mot Supabase-auth (riktig inloggning).</li>
          <li>
            Länka affärsplan och nyckeltal direkt mot tabeller (offers,
            kostnader, intäkter med mera).
          </li>
          <li>
            Lägga till veckovisa mail/notiser med sammanfattning till
            investerare.
          </li>
        </ul>
      </section>
    </InvestorLayout>
  );
};

/* ======= KPI-LOGIK (kan vi finjustera sen när du ger rätt kolumn) ======= */

function calcChange(current: number, previous: number): number {
  if (!previous || !Number.isFinite(previous)) return 0;
  return ((current - previous) / previous) * 100;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Läser Synergybus-nivåer:
 *  - INVEST_SYNERGY_RATES = "0.07,0.09,0.10,0.11" (7, 9, 10, 11 %)
 *  - snittet används som generell procentsats
 *  - fallback: INVEST_SYNERGY_RATE (en siffra, t.ex. 0.09)
 */
function getSynergyRate(): number {
  const raw = process.env.INVEST_SYNERGY_RATES || "";
  if (raw.trim().length > 0) {
    const nums = raw
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0 && n < 1);

    if (nums.length > 0) {
      const sum = nums.reduce((a, b) => a + b, 0);
      return sum / nums.length;
    }
  }

  const fallback = Number(process.env.INVEST_SYNERGY_RATE || "0.1");
  return Number.isFinite(fallback) ? fallback : 0.1;
}

async function sumRevenueForRange(
  startIso: string,
  endIso: string
): Promise<number> {
  const { data, error } = await supabase
    .from("offers")
    .select("total_amount, status, departure_date")
    .in("status", CONFIRMED_STATUSES)
    .gte("departure_date", startIso)
    .lt("departure_date", endIso);

  if (error || !data) {
    console.error("[invest/app] error when fetching offers:", error);
    return 0;
  }

  return (data as any[]).reduce((sum, row) => {
    const value = Number((row as any).total_amount ?? 0);
    if (!Number.isFinite(value)) return sum;
    return sum + value;
  }, 0);
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const now = new Date();

  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousEnd = currentStart;

  const currentRevenue = await sumRevenueForRange(
    formatDate(currentStart),
    formatDate(nextStart)
  );
  const previousRevenue = await sumRevenueForRange(
    formatDate(previousStart),
    formatDate(previousEnd)
  );

  const synergyRate = getSynergyRate();
  const baseCost = Number(process.env.INVEST_BASE_COST || "0");

  const currentCosts = baseCost + currentRevenue * synergyRate;
  const previousCosts = baseCost + previousRevenue * synergyRate;

  const currentProfit = currentRevenue - currentCosts;
  const previousProfit = previousRevenue - previousCosts;

  const kpi: Kpi = {
    revenue: currentRevenue,
    costs: currentCosts,
    profit: currentProfit,
    revenueChange: calcChange(currentRevenue, previousRevenue),
    costsChange: calcChange(currentCosts, previousCosts),
    profitChange: calcChange(currentProfit, previousProfit),
  };

  return {
    props: { kpi },
  };
};

export default InvestorOverviewPage;
