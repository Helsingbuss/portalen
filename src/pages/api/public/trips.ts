// src/pages/api/public/trips.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY // server → helst service key
);

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // lås gärna ner till https://helsingbuss.se och https://www.helsingbuss.se när allt rullar
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Max-Age", "86400");
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v as string));
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v as string));
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const limit = Math.max(1, Math.min(24, Number(req.query.limit) || 6));

    // Hämta resor – håll det enkelt: vi använder start_date som "next_date"
    const { data, error } = await supabase
      .from("trips")
      .select(
        `
        id,
        title,
        subtitle,
        hero_image,
        badge,
        city,
        country,
        price_from,
        ribbon,
        published,
        start_date
      `
      )
      .eq("published", true)
      .order("start_date", { ascending: true, nullsFirst: false })
      .limit(limit);

    if (error) throw error;

    const trips = (data || []).map((r: any) => ({
      id: r.id,
      title: r.title || "",
      subtitle: r.subtitle || null,
      image: r.hero_image || null,
      badge: r.badge || null,            // t.ex. 'shopping' | 'flerdagar' | 'dagsresa'
      city: r.city || null,
      country: r.country || null,
      price_from: r.price_from ?? null,
      ribbon: r.ribbon || null,          // {text,color?} om du vill utveckla senare
      next_date: r.start_date || null,
    }));

    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v as string));
    return res.status(200).json({ trips });
  } catch (e: any) {
    console.error("public/trips error:", e?.message || e);
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v as string));
    return res.status(500).json({ error: "Kunde inte hämta resor." });
  }
}
