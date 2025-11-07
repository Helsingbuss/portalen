// src/pages/api/public/trips/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";
const supabase =
  (admin as any).supabaseAdmin || (admin as any).supabase || (admin as any).default;

type TripRow = {
  id: string;
  title: string;
  subtitle?: string | null;
  trip_kind?: string | null;   // "dagsresa" | "shopping" | "flerdagar"
  badge?: string | null;       // valfri liten tag
  ribbon?: string | null;      // röd banderoll text
  city?: string | null;
  country?: string | null;
  price_from?: number | null;
  hero_image?: string | null;
  external_url?: string | null;
  year?: number | null;        // 2025/2026/2027
  published?: boolean | null;
};

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

  const limit = Math.max(1, Math.min(50, parseInt(String(req.query.limit || "6"), 10) || 6));

  try {
    // HÄMTA ENDAST FÄLT SOM FINNS — INGEN next_date här
    const { data, error } = await supabase
      .from("trips")
      .select(
        "id,title,subtitle,trip_kind,badge,ribbon,city,country,price_from,hero_image,external_url,year,published"
      )
      .eq("published", true)
      .limit(limit);

    if (error) throw error;

    const trips = (data as TripRow[]).map((t) => ({
      id: t.id,
      title: t.title,
      subtitle: t.subtitle ?? null,
      // visa samma “badge” som i admin-preview: prioritera trip_kind, annars badge
      badge: t.trip_kind ?? t.badge ?? null,
      country: t.country ?? null,
      year: t.year ?? null,
      // bildfältet som widgeten använder
      image: t.hero_image ?? null,
      // pris (widgeten skriver "fr. XX kr")
      price_from: t.price_from ?? null,
      // extern länk som du anger i admin
      external_url: t.external_url ?? null,
      // ribbon som objekt { text }
      ribbon: t.ribbon ? { text: t.ribbon } : null,
      // OBS: next_date skickas inte längre – widgeten hanterar att den saknas
    }));

    return res.status(200).json({ ok: true, trips });
  } catch (e: any) {
    console.error("/api/public/trips index:", e?.message || e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
