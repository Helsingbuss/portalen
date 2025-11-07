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

  const limitParam = Number(req.query.limit ?? 6);
  const limit = Math.max(1, Math.min(isNaN(limitParam) ? 6 : limitParam, 24));

  try {
    // 1) Hämta publicerade trips
    const { data: tripsRaw, error: tripsErr } = await supabase
      .from("trips")
      .select(
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

    const trips = (tripsRaw ?? []) as TripRow[];
    const todayMidnight = new Date(new Date().toDateString());

    const out = [];
    for (const t of trips) {
      let next_date: string | null = null;

      try {
        const { data: depRowsRaw } = await supabase
          .from("trip_departures")
          .select("depart_date, dep_date, date")
          .eq("trip_id", t.id);

        const depRows = (depRowsRaw ?? []) as DepRow[];
        const dates: Date[] = depRows
          .map((r) => r.depart_date || r.dep_date || r.date || null)
          .filter((v): v is string => Boolean(v))
          .map((d) => new Date(d))
          .filter((d) => !isNaN(d.getTime()) && d >= todayMidnight)
          .sort((a, b) => a.getTime() - b.getTime());

        if (dates[0]) next_date = dates[0].toISOString().slice(0, 10);
      } catch {
        // svälj departures-fel: vi vill fortfarande visa trip-kortet
        next_date = null;
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
        summary: t.summary ?? null,
        trip_kind: t.trip_kind ?? null,
        categories: t.categories ?? null,
        next_date,
      });
    }

    return res.status(200).json({ ok: true, trips: out });
  } catch (e: any) {
    console.error("/api/public/trips error:", e?.message || e);
    // VIKTIGT: 500 vid fel så widgeten visar felruta korrekt
    return res.status(500).json({ ok: false, error: e?.message || "Server error" });
  }
}
