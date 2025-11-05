// Publik endpoint för widgeten: /api/public/trips?limit=6&kind=shopping&draft=0
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = process.env.NEXT_PUBLIC_SUPABASE_KEY || "";

if (!url || !key) {
  // låt Next starta, men endpointen svarar 500 tydligt
  console.warn("⚠️ Supabase URL/KEY saknas i miljövariabler.");
}

const supabase = createClient(url, key);

// Minimala typer vi returnerar till widgeten
type TripRow = {
  id: string;
  title: string | null;
  subtitle: string | null;
  trip_kind: "flerdagar" | "dagsresa" | "shopping" | null;
  country: string | null;
  price_from: number | null;
  ribbon: string | null;
  hero_image: string | null;
  start_date: string | null;  // YYYY-MM-DD
  published: boolean;
};

type ApiTrip = {
  id: string;
  title: string;
  subtitle: string | null;
  trip_kind: string | null;
  country: string | null;
  price_from: number | null;
  ribbon: string | null;
  image: string | null;
  next_date: string | null;   // YYYY-MM-DD
};

// Enkel CORS-wrapper för WP
function withCors(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    await handler(req, res);
  };
}

export default withCors(async (req, res) => {
  if (!url || !key) {
    res.status(500).json({ error: "Servern saknar Supabase-inställningar." });
    return;
  }

  const limit = Math.max(
    1,
    Math.min(24, parseInt((req.query.limit as string) || "6", 10))
  );
  const kind = (req.query.kind as string | undefined) || undefined;
  const onlyPublished = (req.query.draft as string | undefined) !== "1";

  // Grundfråga mot trips (utan kolumner som inte finns hos dig)
  let q = supabase
    .from("trips")
    .select(
      "id,title,subtitle,trip_kind,country,price_from,ribbon,hero_image,start_date,published"
    )
    .limit(limit);

  if (onlyPublished) q = q.eq("published", true);
  if (kind) q = q.eq("trip_kind", kind);

  // Sortera på start_date om den finns, annars fall-back på id
  q = q.order("start_date", { ascending: true, nullsFirst: false }).order("id", {
    ascending: false,
  });

  const { data: rows, error } = await q;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const trips: ApiTrip[] = [];

  // Hämta nästa avgång per resa från trip_departures.dep_date (om start_date saknas)
  for (const r of (rows || []) as TripRow[]) {
    let nextDate = r.start_date;

    if (!nextDate) {
      const { data: depRows, error: depErr } = await supabase
        .from("trip_departures")
        .select("dep_date")
        .eq("trip_id", r.id)
        .gt("dep_date", today)
        .order("dep_date", { ascending: true })
        .limit(1);

      if (!depErr) nextDate = depRows?.[0]?.dep_date || null;
    }

    trips.push({
      id: r.id,
      title: r.title || "",
      subtitle: r.subtitle ?? null,
      trip_kind: r.trip_kind ?? null,
      country: r.country ?? null,
      price_from: r.price_from ?? null,
      ribbon: r.ribbon ?? null,
      image: r.hero_image ?? null,
      next_date: nextDate ?? null,
    });
  }

  res.json({ trips });
});
