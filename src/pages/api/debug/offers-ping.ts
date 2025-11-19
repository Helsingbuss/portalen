// src/pages/api/debug/offers-ping.ts
import type { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabaseAdmin";
export const config = { runtime: "nodejs" };
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const sel = await supabase.from("offers").select("id").limit(1);
  res.status(200).json({
    ok: !sel.error,
    error: sel.error?.message || null,
    rowsSeen: Array.isArray(sel.data) ? sel.data.length : null,
  });
}
