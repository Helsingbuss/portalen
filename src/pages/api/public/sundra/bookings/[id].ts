import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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
        error: "Boknings-ID saknas.",
      });
    }

    const { data, error } = await supabaseAdmin
      .from("sundra_bookings")
      .select(`
        *,
        sundra_trips (
          id,
          title,
          slug,
          destination,
          image_url,
          currency
        ),
        sundra_departures (
          id,
          departure_date,
          departure_time,
          return_date,
          return_time,
          price
        ),
        sundra_booking_passengers (
          id,
          first_name,
          last_name,
          passenger_type,
          date_of_birth,
          special_requests,
          seat_number
        )
      `)
      .eq("id", id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        ok: false,
        error: "Bokningen hittades inte.",
      });
    }

    return res.status(200).json({
      ok: true,
      booking: data,
    });
  } catch (e: any) {
    console.error("/api/public/sundra/bookings/[id] error:", e?.message || e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte hämta bokningen.",
    });
  }
}
