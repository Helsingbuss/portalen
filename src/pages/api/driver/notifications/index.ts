import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const driverEmail = String(req.query.driverEmail || "").trim().toLowerCase();
    const driverUserId = String(req.query.driverUserId || "").trim();
    const limit = Math.min(Number(req.query.limit || 50), 100);

    if (!driverEmail && !driverUserId) {
      return res.status(400).json({
        ok: false,
        error: "driverEmail eller driverUserId saknas.",
      });
    }

    let query = supabaseAdmin
      .from("driver_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (driverUserId) {
      query = query.eq("driver_user_id", driverUserId);
    } else {
      query = query.eq("driver_email", driverEmail);
    }

    const { data, error } = await query;

    if (error) throw error;

    return res.status(200).json({
      ok: true,
      notifications: data || [],
    });
  } catch (error: any) {
    console.error("/api/driver/notifications error:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hämta förarnotiser.",
    });
  }
}
