// src/pages/api/vehicles/list.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabaseAdmin";




export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Justera kolumner/tabellnamn vid behov Ã¢â‚¬â€œ detta ÃƒÂ¤r safe default
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;
    return res.status(200).json({ ok: true, rows: data ?? [] });
  } catch (e: any) {
    console.error("/api/vehicles/list error:", e?.message || e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}



