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

    // PICKUP STOP
    let pickupStop: any = null;

    const pickupStopId =
      booking.line_stop_id ||
      booking.pickup_stop_id ||
      booking.stop_id ||
      booking.selected_line_stop_id ||
      null;

    if (pickupStopId) {
      const { data } = await supabase
        .from("sundra_line_stops")
        .select("id, stop_name, stop_city, departure_time, price, order_index")
        .eq("id", pickupStopId)
        .maybeSingle();

      pickupStop = data;
    }

    // PASSENGERS
    const { data: passengers } = await supabase
      .from("sundra_booking_passengers")
      .select("*")
      .eq("booking_id", booking.id)
      .order("created_at", { ascending: true });

    // GENERERA PDF
    const assetBaseUrl = `${String(req.headers["x-forwarded-proto"] || "https")}://${String(req.headers.host || "")}`;

    
    // Prisfallback för PDF:
    // Om äldre/testbokningar har total_amount = 0 använder vi delbelopp,
    // avgångens pris eller resans price_from gånger antal resenärer.
    const bookingAny = booking as any;
    const tripAny = (trip || {}) as any;
    const departureAny = (departure || {}) as any;

    const pdfPassengerCount =
      Number(
        bookingAny.passengers_count ||
          bookingAny.passengers ||
          passengers?.length ||
          1
      ) || 1;

    const pdfCalculatedTotal =
      (Number(bookingAny.subtotal || 0) || 0) +
      (Number(bookingAny.options_total || 0) || 0) +
      (Number(bookingAny.room_total || 0) || 0) +
      (Number(bookingAny.seat_extra_total || 0) || 0) -
      (Number(bookingAny.discount_amount || 0) || 0);

    const pdfFallbackUnitPrice =
      Number(departureAny.price || 0) ||
      Number(tripAny.price_from || 0) ||
      0;

    const pdfResolvedTotalAmount =
      Number(bookingAny.total_amount || 0) ||
      pdfCalculatedTotal ||
      pdfFallbackUnitPrice * Math.max(pdfPassengerCount, 1) ||
      0;

const pdfBuffer = await generateSundraTicketPdf({
      assetBaseUrl,
      booking: {
        id: booking.id,
        booking_number: booking.booking_number,
        customer_name: booking.customer_name,
        passengers_count:
          booking.passengers_count ||
          passengers?.length ||
          0,
        total_amount: pdfResolvedTotalAmount,
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

      pickupStop: pickupStop
        ? {
            id: pickupStop.id,
            stop_name: pickupStop.stop_name,
            stop_city: pickupStop.stop_city,
            departure_time: pickupStop.departure_time,
          }
        : {
            stop_name:
              booking.pickup_stop_name ||
              booking.pickup_place ||
              booking.selected_stop_name ||
              booking.selected_pickup_stop ||
              null,
            stop_city: booking.pickup_stop_city || null,
            departure_time: booking.pickup_time || null,
          },

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

    const finalPdfBuffer = Buffer.isBuffer(pdfBuffer)
  ? pdfBuffer
  : Buffer.from(pdfBuffer);

res.setHeader("Content-Length", finalPdfBuffer.length.toString());

return res.status(200).end(finalPdfBuffer);
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

