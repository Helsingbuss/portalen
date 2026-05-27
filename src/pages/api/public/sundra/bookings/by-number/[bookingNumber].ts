import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function clean(value: any) {
  return String(value || "").trim();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  try {
    const bookingNumber = clean(req.query.bookingNumber).toUpperCase();

    if (!bookingNumber) {
      return res.status(400).json({
        ok: false,
        error: "Bokningsnummer saknas.",
      });
    }

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("sundra_bookings")
      .select("*")
      .ilike("booking_number", bookingNumber)
      .limit(1)
      .maybeSingle();

    if (bookingError) {
      throw bookingError;
    }

    if (!booking) {
      return res.status(404).json({
        ok: false,
        error: "Bokningen hittades inte.",
        booking_number: bookingNumber,
      });
    }

    let trip: any = null;
    let departure: any = null;
    let passengers: any[] = [];

    if (booking.trip_id) {
      const { data } = await supabaseAdmin
        .from("sundra_trips")
        .select("*")
        .eq("id", booking.trip_id)
        .limit(1)
        .maybeSingle();

      trip = data || null;
    }

    if (booking.departure_id) {
      const { data } = await supabaseAdmin
        .from("sundra_departures")
        .select("*")
        .eq("id", booking.departure_id)
        .limit(1)
        .maybeSingle();

      departure = data || null;
    }

    const { data: passengerRows } = await supabaseAdmin
      .from("sundra_booking_passengers")
      .select("*")
      .eq("booking_id", booking.id)
      .order("created_at", { ascending: true });

    passengers = passengerRows || [];

    return res.status(200).json({
      ok: true,
      booking: {
        ...booking,
        sundra_trips: trip,
        sundra_departures: departure,
        sundra_booking_passengers: passengers,
      },
    });
  } catch (e: any) {
    console.error("/api/public/sundra/bookings/by-number/[bookingNumber] error:", e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte hämta bokningen.",
    });
  }
}
