import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

import { sendSundraBookingConfirmation } from "@/lib/email/sendSundraBookingConfirmation";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Method not allowed",
      });
    }

    const { bookingId } = req.body || {};

    if (!bookingId) {
      return res.status(400).json({
        error: "bookingId saknas.",
      });
    }

    // BOOKING
    const { data: booking, error: bookingErr } = await supabase
      .from("sundra_bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingErr || !booking) {
      console.error("bookingErr", bookingErr);

      return res.status(404).json({
        error: "Kunde inte hitta bokning.",
      });
    }

    // TRIP
    let trip: any = null;

    if (booking.trip_id) {
      const { data } = await supabase
        .from("sundra_trips")
        .select("*")
        .eq("id", booking.trip_id)
        .single();

      trip = data;
    }

    // DEPARTURE
    let departure: any = null;

    if (booking.departure_id) {
      const { data } = await supabase
        .from("sundra_departures")
        .select("*")
        .eq("id", booking.departure_id)
        .single();

      departure = data;
    }

    // PASSENGERS
    const { data: passengers } = await supabase
      .from("sundra_booking_passengers")
      .select("*")
      .eq("booking_id", booking.id);

    // MAIL
    await sendSundraBookingConfirmation({
      to: booking.customer_email,

      booking: {
        id: booking.id,
        booking_number: booking.booking_number,
        customer_name: booking.customer_name,
        passengers_count:
          booking.passengers_count ||
          passengers?.length ||
          0,
        total_amount: booking.total_amount,
        currency: booking.currency || "SEK",
        payment_status:
          booking.payment_status || "pending",
      },

      trip: trip
        ? {
            title: trip.title,
            destination: trip.destination,
            image_url: trip.image_url,
          }
        : null,

      departure: departure
        ? {
            departure_date: departure.departure_date,
            departure_time: departure.departure_time,
            return_date: departure.return_date,
            return_time: departure.return_time,
          }
        : null,

      passengers: passengers || [],
    });

    return res.status(200).json({
      ok: true,
      message: "Bekräftelsemail skickat.",
    });
  } catch (e: any) {
    console.error(
      "/api/admin/sundra/bookings/send-confirmation error",
      e
    );

    return res.status(500).json({
      error:
        e?.message ||
        "Kunde inte skicka bokningsbekräftelse.",
    });
  }
}
