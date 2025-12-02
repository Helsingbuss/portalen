// src/pages/api/trips/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

type DepartureRow = {
  dep_date?: string;
  dep_time?: string;
  line_name?: string;
  stops?: string[];
  date?: string;
  datum?: string;
  day?: string;
  when?: string;
  departure_date?: string;
};

type Body = {
  id?: string;
  title: string;
  subtitle?: string | null;
  trip_kind?: "flerdagar" | "dagsresa" | "shopping" | string | null;
  badge?: string | null;
  ribbon?: string | null;
  city?: string | null;
  country?: string | null;
  price_from?: number | null;
  hero_image: string | null;
  published: boolean;
  external_url?: string | null;
  year?: number | null;
  summary?: string | null;
  categories?: string[] | null;
  tags?: string[] | null;
  departures?: DepartureRow[];
  departures_coming_soon?: boolean | null;
  lines?: any[] | null;
};

function setCORS(res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function parseDepartureDates(rows: any[] | undefined): string[] {
  if (!rows || !Array.isArray(rows)) return [];
  const out: string[] = [];

  for (const r of rows) {
    const raw =
      r?.date ||
      r?.datum ||
      r?.day ||
      r?.when ||
      r?.dep_date ||
      r?.depart_date ||
      r?.departure_date ||
      null;

    if (!raw) continue;

    const s = String(raw).slice(0, 10); // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) out.push(s);
  }

  return Array.from(new Set(out)).sort((a, b) => (a < b ? -1 : 1));
}

function slugify(title: string): string {
  const base = (title || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base || "resa";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const b = (req.body || {}) as Body;

  if (!b?.title || !b?.hero_image) {
    return res
      .status(400)
      .json({ ok: false, error: "Titel och bild krävs." });
  }

  const tagsArray = Array.isArray(b.tags)
    ? b.tags
    : Array.isArray(b.categories)
    ? b.categories
    : null;

  const base: Record<string, any> = {
    title: (b.title || "").trim(),
    subtitle: b.subtitle ?? null,
    trip_kind: b.trip_kind ?? null,
    badge: b.badge ?? null,
    ribbon: b.ribbon ?? null,
    city: b.city ?? null,
    country: b.country ?? null,
    price_from: b.price_from ?? null,
    hero_image: b.hero_image ?? null,
    published: !!b.published,
    external_url: b.external_url ?? null,
    year: b.year ?? null,
    summary: typeof b.summary === "string" ? b.summary : b.summary ?? null,
    departures_coming_soon: !!b.departures_coming_soon,
    slug: slugify(b.title || ""),
    lines: b.lines ?? null,
  };

  if (tagsArray) {
    base["tags"] = tagsArray.filter(Boolean);
  }

  const dates = parseDepartureDates(b.departures);
  let tripId: string | null = b.id || null;

  try {
    if (tripId) {
      // 🔁 Uppdatera befintlig resa
      const { data, error } = await supabase
        .from("trips")
        .update(base)
        .eq("id", tripId)
        .select("id")
        .single();

      if (error) throw error;
      tripId = data?.id || tripId;
    } else {
      // ➕ Skapa ny resa
      const { data, error } = await supabase
        .from("trips")
        .insert(base)
        .select("id")
        .single();

      if (error) throw error;
      tripId = data?.id || null;
    }
  } catch (e: any) {
    console.error("create trip failed:", e);
    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte spara resa.",
    });
  }

  if (!tripId) {
    return res
      .status(500)
      .json({ ok: false, error: "Kunde inte spara resa (saknar id)." });
  }

  // Uppdatera avgångar
  try {
    await supabase.from("trip_departures").delete().eq("trip_id", tripId);

    if (dates.length) {
      const rows = dates.map((d) => ({ trip_id: tripId, date: d }));
      const { error: depErr } = await supabase
        .from("trip_departures")
        .insert(rows);
      if (depErr) {
        console.warn(
          "create: could not insert departures:",
          depErr.message || depErr
        );
      }
    }
  } catch (e: any) {
    console.warn("create: departures update failed:", e?.message || e);
  }

  return res.status(200).json({
    ok: true,
    id: tripId,
    departures_saved: dates.length,
  });
}
