import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const id = typeof req.query.id === "string" ? req.query.id : "";

    if (!id) {
      return res.status(400).json({ ok: false, error: "ID saknas." });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const { data: order, error } = await supabaseAdmin
      .from("driver_orders")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;

    return res.status(200).json({
      ok: true,
      message: "Körorder skickades om.",
      order: order || null,
    });
  } catch (e: any) {
    console.error("/api/driver-orders/[id]/resend error:", e);
    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte skicka om körorder.",
    });
  }
}
