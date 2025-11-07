// src/pages/api/public/trips/[id].ts
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

function isUuid(v: string): boolean {
  // enkel UUID v4/v5 check
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

type TripRow = {
  id: string;
  title: string;
  subtitle: string | null;
  image?: string | null;       // vissa tabeller heter hero_image
  hero_image?: string | null;
  ribbon?: string | null;
  badge?: string | null;
  trip_kind?: string | null;
  categories?: string[] | null;
  city?: string | null;
  country?: string | null;
  price_from?: number | null;
  year?: number | null;
  external_url?: string | null;
  summary?: string | null;
  published?: boolean | null;
  slug?: string | null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const param = String(req.query.id || "").trim();
  if (!param) return res.status(400).json({ error: "Missing id/slug" });

  try {
    // 1) Hämta trip på id ELLER slug
    const query = supabase.from("trips").select("*").eq(isUuid(param) ? "id" : "slug", param).maybeSingle();
    const { data: trip, error } = await query;

    if (error) throw error;
    if (!trip) return res.status(404).json({ error: "Not found" });

    const t = trip as TripRow;

    // normalisera bildfält
    const image = (t.hero_image ?? t.image) || null;

    // 2) Försök hämta departures (om tabellen finns)
    let next_date: string | null = null;
    try {
      const { data: deps, error: depErr } = await supabase
        .from("trip_departures")
        .select("depart_date")
        .eq("trip_id", t.id)
        .order("depart_date", { ascending: true });

      if (!depErr && Array.isArray(deps) && deps.length) {
        const today = new Date(new Date().toDateString()); // midnatt idag
        const upcoming = deps
          .map((d: any) => new Date(String(d.depart_date)))
          .filter((d: Date) => !isNaN(d.getTime()) && d >= today)
          .sort((a: Date, b: Date) => a.getTime() - b.getTime());

        if (upcoming[0]) next_date = upcoming[0].toISOString().slice(0, 10);
      }
    } catch {
      // ignorera om tabellen saknas
    }

    // 3) Svar i samma form som list-endpointen
    return res.status(200).json({
      trip: {
        id: t.id,
        title: t.title,
        subtitle: t.subtitle,
        image,
        ribbon: t.ribbon ?? null,
        badge: t.badge ?? null,
        trip_kind: t.trip_kind ?? null,
        categories: t.categories ?? [],
        city: t.city ?? null,
        country: t.country ?? null,
        price_from: t.price_from ?? null,
        year: t.year ?? null,
        external_url: t.external_url ?? null,
        summary: t.summary ?? null,
        next_date,
      },
    });
  } catch (e: any) {
    console.error("/api/public/trips/[id]", e?.message || e);
    return res.status(500).json({ error: "Server error" });
  }
}
