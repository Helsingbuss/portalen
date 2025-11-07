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

type TripRow = {
  id: string;
  title: string;
  subtitle?: string | null;
  hero_image?: string | null;
  ribbon?: string | null;
  badge?: string | null;
  city?: string | null;
  country?: string | null;
  price_from?: number | null;
  year?: number | null;
  external_url?: string | null;
  summary?: string | null;
  trip_kind?: string | null;
  categories?: string[] | null;
};

type DepRow = {
  depart_date?: string | null;
  dep_date?: string | null;
  date?: string | null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET")
    return res.status(405).json({ ok: false, error: "Method not allowed" });

  const limit = Math.max(1, Math.min(Number(req.query.limit ?? 6) || 6, 24));

  try {
    // 1) Fetch published trips
    const { data: trips, error: tripsErr } = await supabase
      .from("trips")
      .select<TripRow>(
        [
          "id",
          "title",
          "subtitle",
          "hero_image",
          "ribbon",
          "badge",
          "city",
          "country",
          "price_from",
          "year",
          "external_url",
          "summary",
          "trip_kind",
          "categories",
        ].join(",")
      )
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (tripsErr) throw tripsErr;

    // 2) For each trip, compute next_date (tolerate multiple column names)
    const todayMidnight = new Date(new Date().toDateString());

    const out = [];
    for (const t of trips ?? []) {
      let next_date: string | null = null;

      const { data: depRows, error: depErr } = await supabase
        .from("trip_departures")
        .select<DepRow>("depart_date, dep_date, date")
        .eq("trip_id", t.id);

      if (!depErr && depRows && depRows.length > 0) {
        const dates: Date[] = depRows
          .map((r: DepRow) => r.depart_date || r.dep_date || r.date || null)
          .filter(Boolean)
          .map((d: string) => new Date(d))
          .filter((d: Date) => !isNaN(d.getTime()) && d >= todayMidnight)
          .sort((a: Date, b: Date) => a.getTime() - b.getTime());

        if (dates[0]) next_date = dates[0].toISOString().slice(0, 10);
      }

      out.push({
        id: t.id,
        title: t.title,
        subtitle: t.subtitle ?? null,
        image: t.hero_image ?? null,
        ribbon: t.ribbon ?? null,
        badge: t.badge ?? null,
        city: t.city ?? null,
        country: t.country ?? null,
        price_from: t.price_from ?? null,
        year: t.year ?? null,
        external_url: t.external_url ?? null,
        summary: t.summary ?? null,        // <- short description now included
        trip_kind: t.trip_kind ?? null,    // <- primary category
        categories: t.categories ?? null,  // <- optional extra categories
        next_date,
      });
    }

    return res.status(200).json({ ok: true, trips: out });
  } catch (e: any) {
    console.error("/api/public/trips error:", e?.message || e);
    // Keep widget from breaking hard: still return 200 with ok:false
    return res.status(200).json({ ok: false, error: e?.message || "Server error" });
  }
}
