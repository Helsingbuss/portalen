// src/pages/api/pricing/init.ts
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
    const { data: trips, error: tripsErr } = await supabase
      .from("trips")
      .select("id, title, year")
      .order("created_at", { ascending: true });

    if (tripsErr) throw tripsErr;

    const { data: rawDeps, error: depsErr } = await supabase
      .from("trip_departures")
      .select("trip_id, date, depart_date, dep_date, departure_date")
      .order("trip_id", { ascending: true });

    if (depsErr) throw depsErr;

    const departures =
      (rawDeps || [])
        .map((row: any) => {
          const d =
            row.date ||
            row.depart_date ||
            row.dep_date ||
            row.departure_date ||
            null;
          if (!d) return null;
          const s = String(d).slice(0, 10);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
          return {
            trip_id: row.trip_id as string,
            date: s,
          };
        })
        .filter(Boolean) ?? [];

    return res.status(200).json({
      ok: true,
      trips: trips || [],
      departures,
    });
  } catch (e: any) {
    console.error("/api/pricing/init error:", e);
    return res
      .status(500)
      .json({ ok: false, error: e?.message || "Server error" });
  }
}
