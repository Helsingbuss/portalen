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
      .select("*")
      .order("category", { ascending: true })
      .order("bus_type", { ascending: true });

    if (error) throw error;

    return res.status(200).json({
      ok: true,
      prices: data || [],
      rows: data || [],
      data: data || [],
    });
  } catch (e: any) {
    console.error("/api/admin/prislistor error:", e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte hämta prislistor.",
    });
  }
}
