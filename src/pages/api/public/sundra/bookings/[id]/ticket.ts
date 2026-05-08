import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

import { generateSundraTicketPdf } from "@/lib/pdf/generateSundraTicketPdf";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({
        error: "Method not allowed",
      });
    }

    const bookingId = String(req.query.id || "");

    if (!bookingId) {
      return res.status(400).json({
        error: "Booking ID saknas.",
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
      .eq("booking_id", booking.id)
      .order("created_at", { ascending: true });

    // GENERERA PDF
    const pdfBuffer = await generateSundraTicketPdf({
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
        ticket_hash: booking.ticket_hash || null,
      },

      trip: trip
        ? {
            id: trip.id,
            title: trip.title,
            destination: trip.destination,
          }
        : null,

      departure: departure
        ? {
            id: departure.id,
            departure_date: departure.departure_date,
            departure_time: departure.departure_time,
            return_date: departure.return_date,
            return_time: departure.return_time,
          }
        : null,

      passengers: passengers || [],
    });

    const fileName =
      booking.booking_number ||
      `sundra-ticket-${booking.id}`;

    res.setHeader("Content-Type", "application/pdf");

    res.setHeader(
      "Content-Disposition",
      `inline; filename="${fileName}.pdf"`
    );

    return res.status(200).send(pdfBuffer);
  } catch (e: any) {
    console.error(
      "/api/public/sundra/bookings/[id]/ticket error",
      e
    );

    return res.status(500).json({
      error:
        e?.message ||
        "Kunde inte generera biljett.",
    });
  }
}
