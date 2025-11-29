// src/pages/api/public/trips/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

function setCORS(res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });
  }

  const limit = Math.max(1, Math.min(24, Number(req.query.limit || 6)));

  try {
    const { data: trips, error: tripsErr } = await supabase
      .from("trips")
      .select(
        [
          "id",
          "title",
          "subtitle",
          "hero_image",
          "ribbon",
          "badge",
          "trip_kind",
          "city",
          "country",
          "price_from",
          "year",
          "external_url",
          "summary",
          "published",
          "slug",
          "departures_coming_soon",
        ].join(",")
      )
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (tripsErr) throw tripsErr;

    const todayMs = new Date(new Date().toDateString()).getTime();
    const out: any[] = [];

    for (const t of trips || []) {
      const { data: deps, error: depsErr } = await supabase
        .from("trip_departures")
        .select("date, depart_date, dep_date, departure_date")
        .eq("trip_id", t.id)
        .limit(200);

      if (depsErr) throw depsErr;

      const dates: Date[] = [];
      for (const row of deps || []) {
        const cand = [
          row.date,
          row.depart_date,
          row.dep_date,
          row.departure_date,
        ]
          .filter(Boolean)
          .map((d: any) => new Date(d as string));
        for (const d of cand) {
          if (!isNaN(d.getTime()) && d.getTime() >= todayMs) {
            dates.push(d);
          }
        }
      }
      dates.sort((a, b) => a.getTime() - b.getTime());
      const next_date = dates[0]
        ? dates[0].toISOString().slice(0, 10)
        : null;

      out.push({
        id: t.id,
        title: t.title || "",
        subtitle: t.subtitle || "",
        image: t.hero_image || null,
        ribbon: t.ribbon || null,
        badge: t.badge || t.trip_kind || null,
        trip_kind: t.trip_kind || null,
        categories: [],
        city: t.city || null,
        country: t.country || null,
        price_from: t.price_from ?? null,
        year: t.year ?? null,
        external_url: t.external_url || null,
        summary: t.summary || "",
        next_date,
        slug: t.slug || null,
        departures_coming_soon: !!t.departures_coming_soon,
      });
    }

    return res.status(200).json({ ok: true, trips: out });
  } catch (e: any) {
    console.error("/api/public/trips error:", e?.message || e);
    return res
      .status(200)
      .json({ ok: false, error: "Server error" });
  }
}
