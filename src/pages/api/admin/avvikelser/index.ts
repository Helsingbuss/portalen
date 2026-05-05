import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      const { data, error } = await supabaseAdmin
        .from("avvikelser")
        .select("*")
        .order("reported_at", { ascending: false });

      if (error) throw error;

      return res.status(200).json(data || []);
    }

    if (req.method === "POST") {
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

      if (!title) {
        return res.status(400).json({ error: "Titel saknas." });
      }

      const { data, error } = await supabaseAdmin
        .from("avvikelser")
        .insert([
          {
            booking_id: booking_id || null,
            booking_number: booking_number || null,
            title,
            type: type || "övrigt",
            severity: severity || "normal",
            status: status || "öppen",
            reported_by: reported_by || null,
            reported_at: reported_at || new Date().toISOString(),
            description: description || null,
            action_taken: action_taken || null,
            follow_up: follow_up || null,
            customer_notified: Boolean(customer_notified),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json(data);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e: any) {
    console.error("/api/admin/avvikelser error:", e?.message || e);
    return res.status(500).json({
      error: e?.message || "Kunde inte hantera avvikelse.",
    });
  }
}
