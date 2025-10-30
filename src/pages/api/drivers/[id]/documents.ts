// src/pages/api/drivers/[id]/documents.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id?: string };
  if (!id) return res.status(400).json({ error: "Saknar driver-id" });

  try {
    if (req.method === "POST") {
      const p = req.body ?? {};
      // förväntar: { type: string, file_url: string, expires_at?: string|null }
      const { data, error } = await supabaseAdmin
        .from("driver_documents")
        .insert({
          driver_id: id,
          type: p.type ?? null,
          file_url: p.file_url ?? null,
          expires_at: p.expires_at ?? null,
          uploaded_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error) throw error;

      return res.status(200).json({ ok: true, id: data.id });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e: any) {
    console.error("/api/drivers/[id]/documents error:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Serverfel" });
  }
}
