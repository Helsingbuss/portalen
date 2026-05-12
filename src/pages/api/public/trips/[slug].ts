import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function setCors(res: NextApiResponse) {
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
}

function seatsLeft(departure: any) {
  return Math.max(
    0,
    Number(departure.capacity || 0) -
      Number(departure.booked_count || 0)
  );
}

function sortDepartures(departures: any[] = []) {
  return [...departures].sort((a, b) => {
    const aDate = `${a.departure_date || ""} ${a.departure_time || ""}`;
    const bDate = `${b.departure_date || ""} ${b.departure_time || ""}`;

    return aDate.localeCompare(bDate);
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  setCors(res);

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

    const slug = String(req.query.slug || "").trim();

    if (!slug) {
      return res.status(400).json({
        ok: false,
        error: "Slug saknas.",
      });
    }

    const { data: trip, error } = await supabaseAdmin
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
        status,
        is_featured,

        campaign_label,
        campaign_text,

        card_title,
        card_description,
        price_prefix,
        price_suffix,
        price_subtext,
        card_badge,
        card_theme,

        seo_title,
        seo_description,
        seo_keywords,
        google_tags,

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
          last_booking_date,
          booking_deadline,
          departure_location,
          destination_location,
          bus_map_id
        )
      `)
      .eq("slug", slug)
      .eq("status", "published")
      .single();

    if (error || !trip) {
      return res.status(404).json({
        ok: false,
        error: "Resan hittades inte.",
      });
    }

    const openDepartures = sortDepartures(
      trip.sundra_departures || []
    )
      .filter((departure: any) => departure.status === "open")
      .map((departure: any) => ({
        id: departure.id,
        departure_date: departure.departure_date,
        departure_time: departure.departure_time,
        return_date: departure.return_date,
        return_time: departure.return_time,

        departure_location: departure.departure_location,
        destination_location: departure.destination_location,

        price: Number(departure.price || trip.price_from || 0),
        capacity: Number(departure.capacity || 0),
        booked_count: Number(departure.booked_count || 0),
        seats_left: seatsLeft(departure),

        status: departure.status,
        last_booking_date: departure.last_booking_date,
        booking_deadline: departure.booking_deadline,

        bus_map_id: departure.bus_map_id,
        has_seat_map: Boolean(departure.bus_map_id),
      }));

    const nextDeparture = openDepartures[0] || null;

    return res.status(200).json({
      ok: true,
      trip: {
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
        status: trip.status,
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

        seo_title: trip.seo_title,
        seo_description: trip.seo_description,
        seo_keywords: trip.seo_keywords,
        google_tags: trip.google_tags,

        next_departure: nextDeparture,
        departures: openDepartures,
        departures_count: openDepartures.length,
      },
    });
  } catch (e: any) {
    console.error(
      "/api/public/sundra/trips/[slug] error:",
      e?.message || e
    );

    return res.status(500).json({
      ok: false,
      error:
        e?.message ||
        "Kunde inte hämta resan.",
    });
  }
}
