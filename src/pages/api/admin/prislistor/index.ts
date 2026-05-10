import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const { data, error } = await supabase
      .from("pricing_rules")
      .select("*");

    if (error) throw error;

    const prices: any = {};

    for (const row of data || []) {
      const category = row.category;
      const bus = row.bus_type;

      if (!prices[category]) prices[category] = {};
      if (!prices[category][bus]) prices[category][bus] = {};

      prices[category][bus] = {
        grundavgift: String(row.grundavgift ?? ""),
        tim_vardag: String(row.tim_vardag ?? ""),
        tim_kvall: String(row.tim_kvall ?? ""),
        tim_helg: String(row.tim_helg ?? ""),
        km_0_25: String(row.km_0_25 ?? ""),
        km_26_100: String(row.km_26_100 ?? ""),
        km_101_250: String(row.km_101_250 ?? ""),
        km_251_plus: String(row.km_251_plus ?? ""),
      };
    }

    return res.status(200).json({
      ok: true,
      prices,
    });
  } catch (e: any) {
    console.error("/api/admin/prislistor error:", e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte hämta prislistor.",
    });
  }
}
