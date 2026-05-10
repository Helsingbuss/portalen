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

    const body = req.body || {};
    const rows = Array.isArray(body) ? body : body.rows || body.prices || [];

    if (!Array.isArray(rows)) {
      return res.status(400).json({
        ok: false,
        error: "Fel format. Skicka rows/prices som array.",
      });
    }

    const payload = rows.map((row: any) => ({
      ...row,
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from("pricing_rules")
      .upsert(payload, { onConflict: "id" })
      .select();

    if (error) throw error;

    return res.status(200).json({
      ok: true,
      prices: data || [],
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
