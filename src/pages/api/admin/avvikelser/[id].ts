import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "ID saknas." });
    }

    if (req.method === "GET") {
      const { data, error } = await supabaseAdmin
        .from("avvikelser")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      return res.status(200).json(data);
    }

    if (req.method === "PATCH") {
      const {
        booking_id,
        booking_number,
        title,
        type,
        severity,
        status,
        reported_by,
        reported_at,
        description,
        action_taken,
        follow_up,
        customer_notified,
      } = req.body || {};

      const { data, error } = await supabaseAdmin
        .from("avvikelser")
        .update({
          booking_id: booking_id || null,
          booking_number: booking_number || null,
          title,
          type,
          severity,
          status,
          reported_by: reported_by || null,
          reported_at,
          description: description || null,
          action_taken: action_taken || null,
          follow_up: follow_up || null,
          customer_notified: Boolean(customer_notified),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json(data);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e: any) {
    console.error("/api/admin/avvikelser/[id] error:", e?.message || e);
    return res.status(500).json({
      error: e?.message || "Kunde inte hantera avvikelse.",
    });
  }
}
