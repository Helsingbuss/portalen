// src/pages/api/trips/delete.ts
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
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });
  }

  const { id } = req.body || {};
  if (!id) {
    return res
      .status(400)
      .json({ ok: false, error: "Missing id" });
  }

  try {
    // ta bort avgångar först (om tabellen är kopplad med foreign key)
    const { error: depErr } = await supabase
      .from("trip_departures")
      .delete()
      .eq("trip_id", id);

    if (depErr) {
      console.error("delete: trip_departures error:", depErr);
      // vi fortsätter ändå och försöker ta bort resan
    }

    const { error: tripErr } = await supabase
      .from("trips")
      .delete()
      .eq("id", id);

    if (tripErr) {
      console.error("delete: trips error:", tripErr);
      return res.status(500).json({
        ok: false,
        error: tripErr.message || "Kunde inte ta bort resa.",
      });
    }

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error("/api/trips/delete fatal:", e?.message || e);
    return res
      .status(500)
      .json({ ok: false, error: e?.message || "Server error" });
  }
}
