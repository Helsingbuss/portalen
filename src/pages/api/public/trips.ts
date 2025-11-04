import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_ANON_KEY as string
);

// Enkel CORS för widgeten
function setCors(res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    const limit = Math.min(Number(req.query.limit ?? 12) || 12, 50);

    // Hämta publicerade resor – justera kolumnerna efter din TRIPS-tabell
    const { data, error } = await supabase
      .from("trips")
      .select(
        [
          "id",
          "title",
          "subtitle",
          "hero_image",     // bild-url (om du har)
          "ribbon_text",    // kampanjbanderoll (om du har)
          "badge",          // 'shopping' | 'dagsresa' | 'flerdagar' (om du har)
          "city",
          "country",
          "price_from",
          "start_date"      // nästa datum (precalc eller min(date) från departures)
        ].join(",")
      )
      .eq("published", true)
      .order("start_date", { ascending: true, nullsFirst: false })
      .limit(limit);

    if (error) throw error;

    const trips = (data ?? []).map((t: any) => ({
      id: t.id,
      title: t.title,
      subtitle: t.subtitle ?? null,
      image: t.hero_image ?? null,
      ribbon: t.ribbon_text ?? null,
      badge: t.badge ?? null,
      city: t.city ?? null,
      country: t.country ?? null,
      price_from: t.price_from ?? null,
      next_date: t.start_date ?? null,
    }));

    return res.status(200).json({ trips });
  } catch (e: any) {
    console.error("public/trips error:", e?.message || e);
    return res.status(200).json({ error: "Kunde inte hämta resor." });
  }
}
