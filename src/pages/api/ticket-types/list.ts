// src/pages/api/ticket-types/list.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { data, error } = await supabase
      .from("ticket_types")
      .select(
        "id, code, name, description, kind, sort_order, is_active, created_at"
      )
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;

    return res.status(200).json({ ok: true, items: data || [] });
  } catch (e: any) {
    console.error("/api/ticket-types/list error:", e);
    return res
      .status(500)
      .json({ ok: false, error: e?.message || "Server error" });
  }
}
