// src/pages/api/public/sundra/trips.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // =========================
  // CORS
  // =========================

  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://www.helsingbuss.se"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  res.setHeader(
    "Access-Control-Allow-Credentials",
    "true"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
      });
    }

    const type = String(req.query.type || "all");

    let query = supabaseAdmin
      .from("sundra_trips")
      .select(`
        id,
        title,
        slug,
        category,
        destination,
        location,
        country,
        short_description,
        description,
        image_url,
        price_from,
        currency,
        is_featured,
        status,

        campaign_label,
        campaign_text,
        card_title,
        card_description,
        price_prefix,
        price_suffix,
        price_subtext,
        card_badge,
        card_theme,

        sundra_departures (
          id,
          departure_date,
          departure_time,
          return_date,
          return_time,
          price,
          capacity,
          booked_count,
          status,
          last_booking_date
        )
      `)
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (type === "featured") {
      query = query.eq("is_featured", true);
    }

    const { data, error } = await query;

    if (error) throw error;

    const trips = (data || []).map((trip: any) => {
      const departures = (trip.sundra_departures || [])
        .filter((dep: any) => dep.status === "open")
        .sort((a: any, b: any) =>
          String(a.departure_date).localeCompare(
            String(b.departure_date)
          )
        );

      const nextDeparture = departures[0] || null;

      const seatsLeft = nextDeparture
        ? Math.max(
            0,
            Number(nextDeparture.capacity || 0) -
              Number(nextDeparture.booked_count || 0)
          )
        : null;

      return {
        id: trip.id,
        title: trip.title,
        slug: trip.slug,
        category: trip.category,
        destination: trip.destination,
        location: trip.location,
        country: trip.country,
        short_description: trip.short_description,
        description: trip.description,
        image_url: trip.image_url,
        price_from: trip.price_from,
        currency: trip.currency || "SEK",
        is_featured: trip.is_featured,

        campaign_label: trip.campaign_label,
        campaign_text: trip.campaign_text,
        card_title: trip.card_title,
        card_description: trip.card_description,
        price_prefix: trip.price_prefix || "fr.",
        price_suffix: trip.price_suffix,
        price_subtext: trip.price_subtext,
        card_badge: trip.card_badge,
        card_theme: trip.card_theme || "red",

        next_departure: nextDeparture
          ? {
              id: nextDeparture.id,
              departure_date:
                nextDeparture.departure_date,
              departure_time:
                nextDeparture.departure_time,
              return_date: nextDeparture.return_date,
              return_time: nextDeparture.return_time,
              price: nextDeparture.price,
              capacity: nextDeparture.capacity,
              booked_count:
                nextDeparture.booked_count,
              seats_left: seatsLeft,
            }
          : null,

        departures_count: departures.length,
      };
    });

    return res.status(200).json({
      ok: true,
      type,
      trips,
    });
  } catch (e: any) {
    console.error(
      "/api/public/sundra/trips error:",
      e?.message || e
    );

    return res.status(500).json({
      ok: false,
      error:
        e?.message ||
        "Kunde inte hämta publika resor.",
    });
  }
}
