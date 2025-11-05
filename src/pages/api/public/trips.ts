// src/pages/api/public/trips.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

type TripRow = {
  id: string;
  title?: string | null;
  subtitle?: string | null;
  hero_image?: string | null;
  badge?: string | null;
  city?: string | null;
  country?: string | null;
  price_from?: number | null;
  ribbon?: string | null;
  start_date?: string | null;
};

type PublicTrip = {
  id: string;
  title: string | null;
  subtitle: string | null;
  image: string | null;
  badge: string | null;
  city: string | null;
  country: string | null;
  price_from: number | null;
  ribbon: string | null;
  next_date: string | null;
};

// Allow handlers that return void or Promise<void>
type Handler = (req: NextApiRequest, res: NextApiResponse) => void | Promise<void>;

function withCors(handler: Handler): Handler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      // Do NOT return a value: keep the return type as void
      res.status(200).end();
      return;
    }

    await handler(req, res);
  };
}

function getEnv(name: string) {
  return process.env[name];
}

function getSupabase(): SupabaseClient {
  // Support both server and NEXT_PUBLIC names, plus your SERVICE key name
  const url =
    getEnv("SUPABASE_URL") ||
    getEnv("NEXT_PUBLIC_SUPABASE_URL");

  const key =
    getEnv("SUPABASE_SERVICE_ROLE_KEY") ||
    getEnv("SUPABASE_SERVICE_KEY") ||
    getEnv("SUPABASE_ANON_KEY") ||
    getEnv("NEXT_PUBLIC_SUPABASE_KEY");

  if (!url || !key) {
    throw new Error("Servern saknar Supabase-inställningar.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function parseLimit(raw: unknown, fallback = 6) {
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(1, Math.min(50, Math.floor(n))) : fallback;
}

export default withCors(async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();
    const limit = parseLimit(req.query.limit, 6);

    const BASE_COLS =
      "id,title,subtitle,hero_image,badge,city,country,price_from,ribbon";

    let data: TripRow[] | null = null;

    // Try with start_date, fall back if the column doesn't exist
    const trySelect = async (cols: string) =>
      supabase
        .from("trips")
        .select(cols)
        .eq("published", true)
        .order("start_date", { ascending: true, nullsFirst: false })
        .limit(limit);

    let { data: d1, error: e1 } = await trySelect(`${BASE_COLS},start_date`);
    if (e1 && e1.code === "42703") {
      const { data: d2, error: e2 } = await trySelect(BASE_COLS);
      if (e2) throw e2;
      data = d2 || [];
    } else if (e1) {
      throw e1;
    } else {
      data = d1 || [];
    }

    const trips: PublicTrip[] = (data || []).map((t) => ({
      id: t.id,
      title: t.title ?? null,
      subtitle: t.subtitle ?? null,
      image: t.hero_image ?? null,
      badge: t.badge ?? null,
      city: t.city ?? null,
      country: t.country ?? null,
      price_from: t.price_from ?? null,
      ribbon: t.ribbon ?? null,
      next_date: (t as any).start_date ?? null,
    }));

    res.status(200).json({ trips });
  } catch (err: any) {
    console.error("public/trips error:", err?.code, err?.message || err);
    const msg =
      err?.message === "Servern saknar Supabase-inställningar."
        ? err.message
        : "Kunde inte hämta resor.";
    res.status(500).json({ error: msg });
  }
});
