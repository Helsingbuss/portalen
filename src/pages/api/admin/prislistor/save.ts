import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const prices = req.body?.prices;

    if (!prices || typeof prices !== "object") {
      return res.status(400).json({
        ok: false,
        error: "prices saknas eller har fel format.",
      });
    }

    const rows: any[] = [];

    for (const category of Object.keys(prices)) {
      for (const bus_type of Object.keys(prices[category] || {})) {
        const p = prices[category][bus_type];

        rows.push({
          category,
          bus_type,
          distance_band: "standard",
          grundavgift: Number(p.grundavgift || 0),
          tim_vardag: Number(p.tim_vardag || 0),
          tim_kvall: Number(p.tim_kvall || 0),
          tim_helg: Number(p.tim_helg || 0),
          km_0_25: Number(p.km_0_25 || 0),
          km_26_100: Number(p.km_26_100 || 0),
          km_101_250: Number(p.km_101_250 || 0),
          km_251_plus: Number(p.km_251_plus || 0),
          updated_at: new Date().toISOString(),
        });
      }
    }

    const { data, error } = await supabase
      .from("pricing_rules")
      .upsert(rows, {
        onConflict: "category,bus_type,distance_band",
      })
      .select();

    if (error) throw error;

    return res.status(200).json({
      ok: true,
      rows: data || [],
    });
  } catch (e: any) {
    console.error("/api/admin/prislistor/save error:", e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte spara prislistor.",
    });
  }
}
