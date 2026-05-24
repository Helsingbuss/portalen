import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { id } = req.body || {};

    if (!id) {
      return res.status(400).json({
        ok: false,
        error: "Notis-id saknas.",
      });
    }

    const { data, error } = await supabaseAdmin
      .from("driver_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;

    return res.status(200).json({
      ok: true,
      notification: data,
    });
  } catch (error: any) {
    console.error("/api/driver/notifications/read error:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte markera notisen som läst.",
    });
  }
}
