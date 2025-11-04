// src/pages/api/public/trips.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

type TripOut = {
  id: string;
  title: string;
  subtitle?: string | null;
  image?: string | null;
  badge?: string | null;
  city?: string | null;
  country?: string | null;
  price_from?: number | null;
  ribbon?: string | null;
  next_date?: string | null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ trips: TripOut[] } | { error: string }>
) {
  try {
    const limit = Math.max(1, Math.min(50, Number(req.query.limit ?? 6)));
    const todayISO = new Date().toISOString().slice(0, 10);

    // 1) Hämta resor "snällt"
    const { data: tripsData, error: tripsErr } = await supabase
      .from("trips")
      .select("*")
      .limit(200);

    if (tripsErr) {
      return bail(res, "Kunde inte hämta resor.");
    }

    const trips = (tripsData || []).filter((t: any) =>
      typeof t.published === "boolean" ? t.published : true
    );
    if (!trips.length) return ok(res, []);

    // 2) Nästa avgång – stöd både "date" och "departure_date"
    const idList = trips.map((t: any) => t.id).filter(Boolean);
    const nextDates = new Map<string, string>();

    if (idList.length) {
      // Försök med kolumn "date"
      let depRows: any[] | null = null;

      const trySelect = async (col: "date" | "departure_date") => {
        const { data, error } = await supabase
          .from("trip_departures")
          .select(`trip_id, ${col}`)
          .in("trip_id", idList)
          .gte(col, todayISO)
          .order(col, { ascending: true });
        return { data, error };
      };

      // 2a: försök "date"
      let { data: d1, error: e1 } = await trySelect("date");
      if (!e1) depRows = d1 as any[];

      // 2b: fallback "departure_date" (42703 = undefined column)
      if (e1 && String(e1.code) === "42703") {
        const { data: d2, error: e2 } = await trySelect("departure_date");
        if (!e2) depRows = d2 as any[];
      }

      if (depRows && depRows.length) {
        for (const r of depRows) {
          const tripId = String(r.trip_id);
          const v: string | undefined =
            r.date ?? r.departure_date ?? undefined;
        if (v && !nextDates.has(tripId)) nextDates.set(tripId, String(v));
        }
      }
      // Om tabell saknas helt (42P01) gör vi inget – inga datum, men inget fel.
    }

    // 3) Mappa till publik struktur
    const out: TripOut[] = trips.map((t: any) => ({
      id: String(t.id),
      title: t.title ?? t.name ?? "Resa",
      subtitle: t.subtitle ?? null,
      image: t.hero_image ?? t.image_url ?? null,
      badge: t.badge ?? t.category ?? null,
      city: t.city ?? null,
      country: t.country ?? null,
      price_from: numberOrNull(t.price_from ?? t.price ?? null),
      ribbon: t.ribbon ?? t.promo_text ?? null,
      next_date: nextDates.get(String(t.id)) ?? null,
    }));

    // 4) Sortera på datum om tillgängligt
    out.sort((a, b) => {
      const da = a.next_date ? Date.parse(a.next_date) : Number.MAX_SAFE_INTEGER;
      const db = b.next_date ? Date.parse(b.next_date) : Number.MAX_SAFE_INTEGER;
      return da - db;
    });

    // 5) Returnera begränsat antal + CORS/Cache
    const limited = out.slice(0, limit);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");

    return res.status(200).json({ trips: limited });
  } catch (e: any) {
    console.error("/api/public/trips fatal:", e?.message || e);
    return bail(res, "Kunde inte hämta resor.");
  }
}

function numberOrNull(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function ok(res: NextApiResponse, trips: TripOut[]) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
  return res.status(200).json({ trips });
}

function bail(res: NextApiResponse, msg: string) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  return res.status(200).json({ error: msg });
}
