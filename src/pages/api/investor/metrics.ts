import type { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabaseAdmin";

type MetricsOk = {
  ok: true;
  monthlyRevenue: number;
  monthlyCosts: number;
  monthlyProfit: number;
};

type MetricsErr = {
  ok: false;
  error: string;
};

type MetricsResponse = MetricsOk | MetricsErr;

// Just nu låser vi till år 2026.
// Vill du byta år senare: ändra bara YEAR här.
const YEAR = 2026;

function yearRangeUtc(year: number) {
  const start = new Date(Date.UTC(year, 0, 1));      // 1 jan
  const end   = new Date(Date.UTC(year + 1, 0, 1));  // 1 jan nästa år
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MetricsResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { startIso, endIso } = yearRangeUtc(YEAR);

    // Hämta alla godkända offerter under hela YEAR
    const { data, error } = await supabase
      .from("offers")
      .select("total_amount, synergy_percent, customer_approved_at")
      .not("customer_approved_at", "is", null)
      .gte("customer_approved_at", startIso)
      .lt("customer_approved_at", endIso);

    if (error) {
      console.error("[metrics] supabase error:", error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    let revenueTotal = 0;
    let synergyCostTotal = 0;

    for (const row of data || []) {
      const total = Number((row as any).total_amount) || 0;
      const synergyPercent = Number((row as any).synergy_percent) || 0;

      revenueTotal += total;

      if (synergyPercent > 0) {
        synergyCostTotal += total * (synergyPercent / 100);
      }
    }

    // Fast månadshyra (kan flyttas till tabell sen)
    const MONTHLY_RENT = 14500;

    // Vi räknar månadssnitt genom att dela året på 12
    const months = 12;
    const monthlyRevenue = revenueTotal / months;
    const monthlySynergyCost = synergyCostTotal / months;
    const monthlyCosts = monthlySynergyCost + MONTHLY_RENT;
    const monthlyProfit = monthlyRevenue - monthlyCosts;

    const payload: MetricsOk = {
      ok: true,
      monthlyRevenue,
      monthlyCosts,
      monthlyProfit,
    };

    return res.status(200).json(payload);
  } catch (e: any) {
    console.error("[metrics] unknown error:", e?.message || e);
    return res
      .status(500)
      .json({ ok: false, error: e?.message || "Internal server error" });
  }
}
