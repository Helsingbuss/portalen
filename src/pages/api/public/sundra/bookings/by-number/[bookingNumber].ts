import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
      });
    }

    const bookingNumber = String(req.query.bookingNumber || "").trim();

    if (!bookingNumber) {
      return res.status(400).json({
        ok: false,
        error: "Bokningsnummer saknas.",
      });
    }

    const { data, error } = await supabase
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
      .eq("booking_number", bookingNumber)
      .single();

    if (error || !data) {
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
    console.error(
      "/api/public/sundra/bookings/by-number/[bookingNumber] error:",
      e
    );

    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte hämta bokningen.",
    });
  }
}
