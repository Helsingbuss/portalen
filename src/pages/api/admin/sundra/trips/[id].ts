import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        ok: false,
        error: "ID saknas.",
      });
    }

    // =========================
    // GET
    // =========================
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("sundra_trips")
        .select(`
          *,
          sundra_departures (
            id,
            departure_date,
            departure_time,
            return_date,
            return_time,
            capacity,
            booked_count,
            status
          )
        `)
        .eq("id", id)
        .single();

      if (error) {
        throw error;
      }

      return res.status(200).json({
        ok: true,
        trip: data,
      });
    }

    // =========================
    // PUT
    // =========================
    if (req.method === "PUT") {
      const body = req.body || {};

      const updateData = {
        title:
          body.title || null,

        slug:
          body.slug || null,

        category:
          body.category || null,

        destination:
          body.destination || null,

        location:
          body.location || null,

        country:
          body.country || "Sverige",

        trip_type:
          body.trip_type || "day",

        short_description:
          body.short_description || null,

        description:
          body.description || null,

        program:
          body.program || null,

        image_url:
          body.image_url || null,

        duration_days:
          Number(body.duration_days || 1),

        duration_nights:
          Number(body.duration_nights || 0),

        price_from:
          body.price_from
            ? Number(body.price_from)
            : null,

        hero_badge:
          body.hero_badge || null,

        campaign_label:
          body.campaign_label || null,

        campaign_text:
          body.campaign_text || null,

        card_title:
          body.card_title || null,

        card_description:
          body.card_description || null,

        card_badge:
          body.card_badge || null,

        price_prefix:
          body.price_prefix || "fr.",

        price_suffix:
          body.price_suffix || null,

        price_subtext:
          body.price_subtext || null,

        card_theme:
          body.card_theme || "red",

        google_tags:
          body.google_tags || null,

        seo_keywords:
          body.seo_keywords || null,

        is_featured:
          Boolean(body.is_featured),

        show_on_frontpage:
          Boolean(body.show_on_frontpage),

        show_on_vara_resor:
          body.show_on_vara_resor !== false,

        enable_price_calendar:
          body.enable_price_calendar !== false,

        enable_rooms:
          Boolean(body.enable_rooms),

        enable_options:
          body.enable_options !== false,

        updated_at:
          new Date().toISOString(),
      };

      const { data, error } =
        await supabase
          .from("sundra_trips")
          .update(updateData)
          .eq("id", id)
          .select()
          .single();

      if (error) {
        throw error;
      }

      return res.status(200).json({
        ok: true,
        trip: data,
      });
    }

    // =========================
    // DELETE
    // =========================
    if (req.method === "DELETE") {
      const { error } =
        await supabase
          .from("sundra_trips")
          .delete()
          .eq("id", id);

      if (error) {
        throw error;
      }

      return res.status(200).json({
        ok: true,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (e: any) {
    console.error(
      "/api/admin/sundra/trips/[id] error:",
      e
    );

    return res.status(500).json({
      ok: false,
      error:
        e?.message ||
        "Kunde inte hantera resa.",
    });
  }
}
