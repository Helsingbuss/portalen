// src/pages/api/admin/pricing/delete.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";

type DeleteResponse = {
  ok: boolean;
  error?: string;
  id?: number;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DeleteResponse>
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed (use POST)." });
  }

  const { id } = req.body || {};
  const numericId = Number(id);

  if (!numericId || Number.isNaN(numericId)) {
    return res.status(400).json({
      ok: false,
      error: "Ogiltigt id.",
    });
  }

  try {
    const { error } = await supabase
      .from("trip_ticket_pricing")
      .delete()
      .eq("id", numericId);

    if (error) throw error;

    return res.status(200).json({ ok: true, id: numericId });
  } catch (e: any) {
    console.error("pricing/delete error", e);
    return res.status(500).json({
      ok: false,
      error: e?.message || "Tekniskt fel vid borttagning av pris.",
    });
  }
}
