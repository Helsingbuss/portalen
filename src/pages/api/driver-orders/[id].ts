import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const id = typeof req.query.id === "string" ? req.query.id : "";

    if (!id) {
      return res.status(400).json({ ok: false, error: "ID saknas." });
    }

    if (req.method === "GET") {
      const { data, error } = await supabaseAdmin
        .from("driver_orders")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;

      return res.status(200).json({ ok: true, order: data || null });
    }

    if (req.method === "PATCH" || req.method === "PUT") {
      const body = req.body || {};

      const { data, error } = await supabaseAdmin
        .from("driver_orders")
        .update({
          ...body,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .maybeSingle();

      if (error) throw error;

      return res.status(200).json({ ok: true, order: data || null });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (e: any) {
    console.error("/api/driver-orders/[id] error:", e);
    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte hantera körorder.",
    });
  }
}
