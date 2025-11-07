// src/pages/api/public/trips/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";
const supabase =
  (admin as any).supabaseAdmin || (admin as any).supabase || (admin as any).default;

function setCORS(res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 6));
  const todayISO = new Date().toISOString();

  try {
    // 1) Hämta publicerade resor
    const { data: trips, error } = await supabase
      .from("trips")
      .select(
        [
          "id",
          "title",
          "subtitle",
          "short_description",
          "hero_image",
          "price_from",
          "country",
          "badge",
          "external_url",
          "year",
          "published",
        ].join(",")
      )
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    // 2) För varje resa: hämta de två närmaste framtida avgångarna
    const out = [];
    for (const t of trips || []) {
      const { data: deps, error: depErr } = await supabase
        .from("trip_departures")
        .select("date")
        .eq("trip_id", t.id)
        .gte("date", todayISO)
        .order("date", { ascending: true })
        .limit(2);

      if (depErr) throw depErr;

      const nextDate = deps?.[0]?.date || null;
      const hasMoreDates = (deps?.length || 0) > 1;

      out.push({
        id: t.id,
        title: t.title,
        // Beskrivning på kortet – använd subtitle först, annars short_description
        subtitle: t.subtitle || t.short_description || null,
        image: t.hero_image,
        price_from: t.price_from,
        country: t.country,
        badge: t.badge,
        external_url: t.external_url || null,
        year: t.year || null,

        // Nya fält för widgeten
        next_date: nextDate,       // ISO-sträng
        has_more_dates: hasMoreDates,
      });
    }

    return res.status(200).json({ ok: true, trips: out });
  } catch (e: any) {
    console.error("/api/public/trips", e?.message || e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
