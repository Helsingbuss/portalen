// src/pages/api/trips/list.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { data, error } = await supabase
      .from("trips")
      .select(
        [
          "id",
          "title",
          "subtitle",
          "trip_kind",
          "badge",
          "country",
          "year",
          "price_from",
          "published",
          "hero_image",
        ].join(",")
      )
      // om created_at inte finns ignorerar vi felet i loggen
      .order("created_at", { ascending: false } as any);

    if (error) throw error;

    // Hämta “nästa avgång” per resa (från trip_departures)
    const ids = (data || []).map((t: any) => t.id);
    let next: Record<string, string | null> = {};

    if (ids.length) {
      const { data: dep, error: depErr } = await supabase
        .from("trip_departures")
        .select("trip_id, depart_date, date")
        .in("trip_id", ids);

      if (!depErr && dep) {
        const byTrip: Record<string, Date[]> = {};

        dep.forEach((r: any) => {
          const raw = r.depart_date || r.date;
          if (!raw) return;

          const d = new Date(raw);
          if (isNaN(d.getTime())) return;

          if (!byTrip[r.trip_id]) byTrip[r.trip_id] = [];
          byTrip[r.trip_id].push(d);
        });

        const today = new Date(new Date().toDateString());

        Object.keys(byTrip).forEach((k) => {
          const dates = byTrip[k]
            .filter((d) => d >= today)
            .sort((a, b) => a.getTime() - b.getTime());

          next[k] = dates[0] ? dates[0].toISOString().slice(0, 10) : null;
        });
      }
    }

    const rows = (data || []).map((t: any) => ({
      ...t,
      next_date: next[t.id] ?? null,
    }));

    res.status(200).json({ ok: true, trips: rows });
  } catch (e: any) {
    console.error("/api/trips/list", e?.message || e);
    res.status(500).json({ ok: false, error: "Server error" });
  }
}
