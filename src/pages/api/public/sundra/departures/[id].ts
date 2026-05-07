import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function seatsLeft(dep: any) {
  return Math.max(
    0,
    Number(dep?.capacity || 0) - Number(dep?.booked_count || 0)
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
      });
    }

    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        ok: false,
        error: "Avgångs-ID saknas.",
      });
    }

    const { data, error } = await supabaseAdmin
      .from("sundra_departures")
      .select(`
        id,
        trip_id,
        departure_date,
        departure_time,
        return_date,
        return_time,
        price,
        capacity,
        booked_count,
        status,
        last_booking_date,

        sundra_trips (
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
          trip_type,
          duration_days,
          duration_nights,
          currency,
          enable_rooms,
          enable_options,
          enable_price_calendar,
          booking_intro,
          overview_text
        )
      `)
      .eq("id", id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        ok: false,
        error: "Avgången hittades inte.",
      });
    }

    if (data.status !== "open") {
      return res.status(400).json({
        ok: false,
        error: "Denna avgång är inte bokningsbar just nu.",
      });
    }

    return res.status(200).json({
      ok: true,
      departure: {
        ...data,
        seats_left: seatsLeft(data),
      },
    });
  } catch (e: any) {
    console.error("/api/public/sundra/departures/[id] error:", e?.message || e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte hämta avgången.",
    });
  }
}
