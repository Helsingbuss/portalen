import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";




export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const { data, error } = await supabaseAdmin.from("drivers").select("id").limit(1);
    if (error) throw error;
    res.status(200).json({ ok: true, found: data?.length ?? 0 });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "unknown" });
  }
}



