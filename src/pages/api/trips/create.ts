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
  stops?: string[] | string;

  // fallback-fält om något gammalt UI skickar andra namn
  date?: string;
  datum?: string;
  day?: string;
  when?: string;
  depart_date?: string;
  departure_date?: string;
};

type Body = {
  id?: string; // finns = uppdatera, annars skapa ny
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
  summary?: string | null; // "Kort om resan"
  categories?: string[] | null;
  tags?: string[] | null;
  departures?: DepartureRow[];
  departures_coming_soon?: boolean | null;
  lines?: any[] | null;
  slug?: string | null;
};

function setCORS(res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
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

// bygger rader för tabellen trip_departures
function buildDepartureRows(tripId: string, src: DepartureRow[] | undefined | null) {
  if (!tripId || !src || !Array.isArray(src)) return [] as any[];

  const rows: any[] = [];

  for (const r of src) {
    const rawDate =
      r.dep_date ||
      r.date ||
      r.depart_date ||
      r.departure_date ||
      r.datum ||
      r.day ||
      r.when ||
      null;

    if (!rawDate) continue;

    const dateStr = String(rawDate).slice(0, 10); // YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue;

    let stopsArr: string[] = [];
    if (Array.isArray(r.stops)) {
      stopsArr = r.stops.filter(Boolean).map((s) => String(s).trim());
    } else if (typeof r.stops === "string") {
      stopsArr = r.stops
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    rows.push({
      trip_id: tripId,
      date: dateStr,
      dep_time: r.dep_time || null,
      line_name: r.line_name || null,
      stops: stopsArr,
    });
  }

  return rows;
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

  // Basic validering
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
    summary: b.summary ?? null,
    departures_coming_soon: !!b.departures_coming_soon,
    lines: Array.isArray(b.lines) ? b.lines : null,
    slug: (b.slug && b.slug.trim()) || slugify(b.title || ""),
  };

  if (tagsArray) {
    base["tags"] = tagsArray.filter(Boolean);
  }

  const departuresInput = Array.isArray(b.departures) ? b.departures : [];

  let tripId: string | null = null;

  try {
    // 🔁 UPDATE om id finns, annars INSERT
    if (b.id) {
      const { data, error } = await supabase
        .from("trips")
        .update(base)
        .eq("id", b.id)
        .select("id")
        .single();

      if (error) throw error;
      tripId = data?.id || b.id;
    } else {
      const { data, error } = await supabase
        .from("trips")
        .insert(base)
        .select("id")
        .single();

      if (error) throw error;
      tripId = data?.id || null;
    }
  } catch (e: any) {
    console.error("create/update trip failed:", e);
    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte spara resa.",
    });
  }

  if (!tripId) {
    return res
      .status(500)
      .json({ ok: false, error: "Kunde inte skapa/uppdatera resa (saknar id)." });
  }

  // 🚌 Uppdatera Turlista / avgångar
  try {
    // Ta bort tidigare avgångar för resan
    await supabase.from("trip_departures").delete().eq("trip_id", tripId);

    const depRows = buildDepartureRows(tripId, departuresInput);

    if (depRows.length) {
      const { error: depErr } = await supabase
        .from("trip_departures")
        .insert(depRows);
      if (depErr) {
        console.warn(
          "create: could not insert departures:",
          depErr.message || depErr
        );
      }
    }
  } catch (e: any) {
    console.warn("create: departures update failed:", e?.message || e);
    // resan är ändå sparad, så vi låter svaret vara ok
  }

  return res.status(200).json({
    ok: true,
    id: tripId,
    departures_saved: departuresInput.length,
  });
}
