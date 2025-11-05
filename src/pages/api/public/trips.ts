import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

/** Endast kolumner som vi VET finns (kräv inte city/country/created_at) */
type TripRow = {
  id: string;
  title: string | null;
  subtitle: string | null;
  hero_image: string | null;   // valfri
  price_from: number | null;   // valfri
  badge: string | null;        // valfri
  ribbon: string | null;       // valfri
  start_date: string | null;   // valfri, YYYY-MM-DD
};

type ApiOut = {
  trips: Array<{
    id: string;
    title: string;
    subtitle: string | null;
    image: string | null;
    city: string | null;       // levereras som null tills du skapat kolumnen
    country: string | null;    // levereras som null tills du skapat kolumnen
    price_from: number | null;
    badge: string | null;
    ribbon: string | null;
    next_date: string | null;
  }>;
};

const REQUIRED_COLS =
  "id,title,subtitle,hero_image,price_from,badge,ribbon,start_date";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_KEY;

type Handler = (req: NextApiRequest, res: NextApiResponse) => Promise<void>;
function withCors(handler: Handler): Handler {
  return async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.status(200).end();
      return;
    }
    await handler(req, res);
  };
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    res.status(500).json({ error: "Servern saknar Supabase-inställningar." });
    return;
  }
  if (req.method !== "GET") {
    res.status(405).json({ error: "Endast GET stöds." });
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

  const limit = Math.max(1, Math.min(24, Number(req.query.limit) || 6));
  const orderByNextDate = (req.query.order as string | undefined) === "date";
  const filterPublished = (req.query.published as string | undefined) !== "all";

  // Bygg query – välj ENDAST kolumner som finns säkert
  let q = supabase.from("trips").select(REQUIRED_COLS).limit(limit);

  if (filterPublished) q = q.eq("published", true).maybeSingle ? q : q; // tyst för TS
  // sortera hellre på start_date (om finns) annars id – använd inte created_at
  if (orderByNextDate) {
    q = q.order("start_date", { ascending: true, nullsFirst: false });
  } else {
    q = q.order("id", { ascending: false });
  }

  const { data, error } = await q.returns<TripRow[]>();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const trips =
    (data || []).map((t) => ({
      id: t.id,
      title: t.title ?? "—",
      subtitle: t.subtitle ?? null,
      image: t.hero_image ?? null,
      city: null,                  // tills kolumnerna finns
      country: null,               // tills kolumnerna finns
      price_from: t.price_from ?? null,
      badge: t.badge ?? null,
      ribbon: t.ribbon ?? null,
      next_date: t.start_date ?? null,
    })) ?? [];

  const out: ApiOut = { trips };
  res.status(200).json(out);
}

export default withCors(handler);
