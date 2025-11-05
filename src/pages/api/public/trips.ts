// src/pages/api/public/trips.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient, type PostgrestError } from "@supabase/supabase-js";

/* -------------------- Typer (DB → API) -------------------- */
type TripRow = {
  id: string;
  title?: string | null;
  subtitle?: string | null;
  hero_image?: string | null;
  badge?: string | null;
  city?: string | null;
  country?: string | null;
  price_from?: number | null;
  trip_kind?: "flerdagar" | "dagsresa" | "shopping" | string | null;
  ribbon?: string | null;
  slug?: string | null;
  start_date?: string | null;     // kan saknas i din schema
  created_at?: string | null;     // kan saknas
  published?: boolean | null;     // kan saknas
};

type PublicTrip = {
  id: string;
  title: string | null;
  headline: string | null;
  image: string | null;
  tripKind: string | null;
  location: string | null;
  priceFrom: number | null;
  badge: string | null;
  ribbon: string | null;
  slug: string | null;
};

type Ok = { items: PublicTrip[] };
type Fail = { error: string };

/* -------------------- Hjälpfunktioner -------------------- */

function num(v: string | string[] | undefined, fallback: number, min = 1, max = 50): number {
  const n = Array.isArray(v) ? parseInt(v[0] ?? "", 10) : parseInt(v ?? "", 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function isMissingColumn(e: PostgrestError | null): boolean {
  // Postgres undefined_column
  return !!e && (e.code === "42703" || /column .* does not exist/i.test(e.message || ""));
}

function toPublic(row: TripRow): PublicTrip {
  const location = [row.city, row.country].filter(Boolean).join(", ");
  return {
    id: row.id,
    title: row.title ?? null,
    headline: row.subtitle ?? null,
    image: row.hero_image ?? null,
    tripKind: row.trip_kind ?? null,
    location: location || null,
    priceFrom: typeof row.price_from === "number" ? row.price_from : null,
    badge: row.badge ?? null,
    ribbon: row.ribbon ?? null,
    slug: row.slug ?? null,
  };
}

/* CORS-wrapper: tillåter anrop från WordPress-domänen */
type Handler = (req: NextApiRequest, res: NextApiResponse) => Promise<void>;
function withCors(handler: Handler): Handler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
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

/* -------------------- Huvudhandler -------------------- */
const handler: Handler = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: "Servern saknar Supabase-inställningar." });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const limit = num(req.query.limit, 12, 1, 50);
  const kind = (req.query.kind as string | undefined)?.trim() || "";
  const search = (req.query.search as string | undefined)?.trim() || "";

  // Bas-kolumner vi försöker hämta
  const COLS =
    "id,title,subtitle,hero_image,badge,city,country,price_from,trip_kind,ribbon,slug,start_date,created_at,published";

  // Bygg en query som funkar även om vissa kolumner saknas. Vi provar med
  // (1) filter published + sortera på start_date
  // (2) om kolumn saknas → försök utan published
  // (3) om start_date saknas → sortera på created_at
  async function runQuery(orderByStartDate: boolean, filterPublished: boolean) {
    let q = supabase.from("trips").select(COLS).returns<TripRow[]>().limit(limit);

    if (filterPublished) q = q.eq("published", true);

    if (kind) q = q.eq("trip_kind", kind);

    if (search) {
      // Enkel OR-sökning på titel/stad/land
      q = q.or(
        ["title.ilike.%"+search+"%", "city.ilike.%"+search+"%", "country.ilike.%"+search+"%"].join(",")
      );
    }

    if (orderByStartDate) {
      q = q.order("start_date", { ascending: true, nullsFirst: false });
    } else {
      q = q.order("created_at", { ascending: false, nullsFirst: true });
    }

    return q;
  }

  // Försök 1: published + start_date
  let { data, error } = await runQuery(true, true);
  if (error) {
    // Om kolumnfelet gäller published ELLER start_date – fellina försiktigt
    if (isMissingColumn(error)) {
      // Försök 2: utan published, med start_date
      const r2 = await runQuery(true, false);
      let { data: d2, error: e2 } = await r2;
      if (e2 && isMissingColumn(e2)) {
        // Försök 3: utan published, med created_at
        const r3 = await runQuery(false, false);
        let { data: d3, error: e3 } = await r3;
        if (e3) {
          res.status(500).json({ error: e3.message || "Kunde inte hämta resor (3)." });
          return;
        }
        data = d3 ?? [];
      } else if (e2) {
        res.status(500).json({ error: e2.message || "Kunde inte hämta resor (2)." });
        return;
      } else {
        data = d2 ?? [];
      }
    } else {
      res.status(500).json({ error: error.message || "Kunde inte hämta resor (1)." });
      return;
    }
  }

  const items = (data ?? []).map(toPublic);
  res.status(200).json({ items } satisfies Ok);
};

export default withCors(handler);
