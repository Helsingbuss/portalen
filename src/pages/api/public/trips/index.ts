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
  subtitle: string | null;
  // OBS: vi försöker båda namnen – ta det som finns i din DB:
  summary?: string | null;        // “Kort om resan” (om du döpt fältet så)
  description?: string | null;    // alternativt namn
  hero_image: string | null;
  ribbon: string | null;
  badge: string | null;           // liten tag (valfritt)
  trip_kind?: string | null;      // huvudsaklig kategori
  tags?: string[] | null;         // flera kategorier (valfritt text[])
  city: string | null;
  country: string | null;
  price_from: number | null;
  year: number | null;
  external_url: string | null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 6));

  try {
    // 1) Hämta publicerade resor
    const { data, error } = await supabase
      .from("trips")
      .select(
        [
          "id",
          "title",
          "subtitle",
          "summary",        // om fältet finns
          "description",    // fallback om du använt detta namn
          "hero_image",
          "ribbon",
          "badge",
          "trip_kind",
          "tags",
          "city",
          "country",
          "price_from",
          "year",
          "external_url",
        ].join(",")
      )
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    const ids = (data || []).map((r: TripRow) => r.id);
    let nextDates: Record<string, string | null> = {};

    // 2) Hämta närmsta avgång per resa (kolumnen heter hos dig "date")
    if (ids.length) {
      const { data: dep, error: derr } = await supabase
        .from("trip_departures")
        .select("trip_id,date") // <= viktigt: 'date' matchar din tabell
        .in("trip_id", ids)
        .order("date", { ascending: true });

      if (derr) throw derr;

      for (const row of dep || []) {
        const tid = row.trip_id as string;
        const d = row.date as string | null;
        if (!d) continue;
        if (!nextDates[tid]) nextDates[tid] = d; // första (tidigaste)
      }
    }

    // 3) Mappa till widget-format
    const trips = (data || []).map((r: TripRow) => {
      // beskrivning: summary → description → null
      const description = (r.summary ?? r.description ?? null) as string | null;

      // kategorier (piller): kombinera trip_kind + tags (unika, sanningsvärde)
      const cats = [
        r.trip_kind || "",
        ...(Array.isArray(r.tags) ? r.tags : []),
      ]
        .map(s => (s || "").trim())
        .filter(Boolean);

      const uniqCats = Array.from(new Set(cats));

      return {
        id: r.id,
        title: r.title,
        subtitle: r.subtitle,
        description,                 // <- NYCKELN som widgeten visar
        image: r.hero_image,
        ribbon: r.ribbon,
        badge: r.badge,              // kvar om du använder den
        trip_kind: r.trip_kind,      // huvudsaklig kategori
        categories: uniqCats,        // flera kategorier
        city: r.city,
        country: r.country,
        price_from: r.price_from,
        year: r.year,
        external_url: r.external_url,
        next_date: nextDates[r.id] || null,
      };
    });

    return res.status(200).json({ ok: true, trips });
  } catch (e: any) {
    console.error("/api/public/trips error:", e?.message || e);
    return res.status(500).json({ ok: false, error: e?.message || "Server error" });
  }
}
