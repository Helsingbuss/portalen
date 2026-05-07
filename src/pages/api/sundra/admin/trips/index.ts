import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/å/g, "a")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toNumber(value: any, fallback = 0) {
  if (value === "" || value === null || value === undefined) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toNullableNumber(value: any) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toJsonArray(value: any) {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    return value
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
  }

  return [];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      const { data, error } = await supabaseAdmin
        .from("sundra_trips")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        trips: data || [],
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};

      if (!body.title || !String(body.title).trim()) {
        return res.status(400).json({
          ok: false,
          error: "Titel saknas.",
        });
      }

      const title = String(body.title).trim();
      const slug = body.slug?.trim() || slugify(title);

      const insertData = {
        title,
        slug,

        category: body.category || null,
        destination: body.destination || null,
        location: body.location || null,
        country: body.country || null,

        trip_type: body.trip_type || "day",
        duration_days: toNumber(body.duration_days, 1),
        duration_nights: toNumber(body.duration_nights, 0),

        short_description: body.short_description || null,
        description: body.description || null,
        program: body.program || null,
        included: body.included || null,
        not_included: body.not_included || null,
        terms: body.terms || null,

        hero_badge: body.hero_badge || null,
        booking_intro: body.booking_intro || null,
        overview_text: body.overview_text || null,

        facts: toJsonArray(body.facts),
        highlights: toJsonArray(body.highlights),
        departure_points: toJsonArray(body.departure_points),

        image_url: body.image_url || null,
        gallery: Array.isArray(body.gallery) ? body.gallery : [],

        price_from: toNumber(body.price_from, 0),
        currency: body.currency || "SEK",

        min_passengers: toNumber(body.min_passengers, 1),
        max_passengers: toNullableNumber(body.max_passengers),

        enable_options: Boolean(body.enable_options),
        enable_rooms: Boolean(body.enable_rooms),
        enable_price_calendar:
          body.enable_price_calendar === undefined
            ? true
            : Boolean(body.enable_price_calendar),

        campaign_label: body.campaign_label || null,
        campaign_text: body.campaign_text || null,
        card_title: body.card_title || null,
        card_description: body.card_description || null,
        price_prefix: body.price_prefix || "fr.",
        price_suffix: body.price_suffix || null,
        price_subtext: body.price_subtext || null,
        card_badge: body.card_badge || null,
        card_theme: body.card_theme || "red",

        status: body.status || "draft",
        is_featured: Boolean(body.is_featured),

        seo_title: body.seo_title || null,
        seo_description: body.seo_description || null,

        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabaseAdmin
        .from("sundra_trips")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        trip: data,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (e: any) {
    console.error("/api/admin/sundra/trips error:", e?.message || e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte hantera resor.",
    });
  }
}
