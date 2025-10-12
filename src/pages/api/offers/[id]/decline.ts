// src/pages/api/offers/[id]/decline.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query as { id?: string };
  if (!id) return res.status(400).json({ error: "Missing id" });

  const { reason } = (req.body || {}) as { reason?: string };

  try {
    const patch: Record<string, any> = {
      status: "makulerad",
      declined_at: new Date().toISOString(),
    };
    if (reason) patch.decline_reason = reason;

    const { error } = await supabase.from("offers").update(patch).eq("id", id);
    if (error) throw error;

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
