import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

import { sendSundraBookingConfirmation } from "@/lib/email/sendSundraBookingConfirmation";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
      });
    }

    const body = req.body || {};

    const bookingNumber =
      body.booking_number ||
      body.checkout_reference ||
      body.reference ||
      body.metadata?.booking_number ||
      null;

    const bookingId =
      body.booking_id ||
      body.metadata?.booking_id ||
      null;

    const paymentReference =
      body.payment_reference ||
      body.transaction_id ||
      body.id ||
      body.checkout_id ||
      null;

    const paymentStatusRaw =
      body.payment_status ||
      body.status ||
      body.event_type ||
      "";

    const isPaid =
      paymentStatusRaw === "paid" ||
      paymentStatusRaw === "PAID" ||
      paymentStatusRaw === "successful" ||
      paymentStatusRaw === "SUCCESSFUL" ||
      paymentStatusRaw === "checkout.status.updated" ||
      body.paid === true;

    if (!bookingNumber && !bookingId) {
      return res.status(400).json({
        ok: false,
        error: "Saknar bokningsreferens.",
      });
    }

    let query = supabase.from("sundra_bookings").select("*");

    if (bookingId) {
      query = query.eq("id", bookingId);
    } else {
      query = query.eq("booking_number", bookingNumber);
    }

    const { data: booking, error: bookingErr } = await query.single();

    if (bookingErr || !booking) {
      console.error("sundra-webhook bookingErr:", bookingErr);

      return res.status(404).json({
        ok: false,
        error: "Bokningen hittades inte.",
      });
    }

    if (!isPaid) {
      await supabase
        .from("sundra_bookings")
        .update({
          payment_reference: paymentReference || booking.payment_reference,
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id);

      return res.status(200).json({
        ok: true,
        message: "Webhook mottagen men betalning är inte markerad som betald.",
      });
    }

    const { data: updatedBooking, error: updateErr } = await supabase
      .from("sundra_bookings")
      .update({
        status: "confirmed",
        payment_status: "paid",
        payment_reference: paymentReference || booking.payment_reference,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking.id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    const { data: trip } = await supabase
      .from("sundra_trips")
      .select("*")
      .eq("id", updatedBooking.trip_id)
      .single();

    const { data: departure } = await supabase
      .from("sundra_departures")
      .select("*")
      .eq("id", updatedBooking.departure_id)
      .single();

    const { data: passengers } = await supabase
      .from("sundra_booking_passengers")
      .select("*")
      .eq("booking_id", updatedBooking.id)
      .order("created_at", { ascending: true });

    if (updatedBooking.customer_email) {
      await sendSundraBookingConfirmation({
        to: updatedBooking.customer_email,

        booking: {
          id: updatedBooking.id,
          booking_number: updatedBooking.booking_number,
          customer_name: updatedBooking.customer_name,
          passengers_count:
            updatedBooking.passengers_count || passengers?.length || 0,
          total_amount: updatedBooking.total_amount,
          currency: updatedBooking.currency || "SEK",
          payment_status: "paid",
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
    }

    return res.status(200).json({
      ok: true,
      message: "Betalning markerad som betald och mail skickat.",
      booking_id: updatedBooking.id,
      booking_number: updatedBooking.booking_number,
    });
  } catch (e: any) {
    console.error("/api/payments/sundra-webhook error:", e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte hantera Sundra webhook.",
    });
  }
}
