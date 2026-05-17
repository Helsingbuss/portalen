import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendShuttleBookingEmail } from "@/lib/shuttle/sendBookingEmail";

export const config = {
  api: {
    bodyParser: true,
  },
};

async function getCheckout(checkoutId: string) {
  const apiKey = process.env.SUMUP_API_KEY;

  if (!apiKey) {
    throw new Error("SUMUP_API_KEY saknas.");
  }

  const res = await fetch(
    `https://api.sumup.com/v0.1/checkouts/${checkoutId}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.message || "Kunde inte hämta SumUp checkout.");
  }

  return json;
}

function isPaidStatus(status: string) {
  return (
    status === "paid" ||
    status === "successful" ||
    status === "succeeded"
  );
}

function isFailedStatus(status: string) {
  return (
    status === "failed" ||
    status === "cancelled" ||
    status === "canceled"
  );
}

async function handleSundraBooking(checkoutReference: string, checkout: any) {
  const { data: booking, error: bookingError } = await supabaseAdmin
    .from("sundra_bookings")
    .select(`
      *,
      sundra_departures (
        id,
        booked_count
      )
    `)
    .eq("booking_number", checkoutReference)
    .maybeSingle();

  if (bookingError) throw bookingError;
  if (!booking) return null;

  const status = String(checkout?.status || "").toLowerCase();

  if (!isPaidStatus(status)) {
    return {
      ok: true,
      type: "sundra",
      ignored: true,
      status,
    };
  }

  if (booking.payment_status === "paid") {
    return {
      ok: true,
      type: "sundra",
      already_paid: true,
    };
  }

  await supabaseAdmin
    .from("sundra_bookings")
    .update({
      payment_status: "paid",
      status: "confirmed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", booking.id);

  const departure: any = Array.isArray(booking.sundra_departures)
    ? booking.sundra_departures[0]
    : booking.sundra_departures;

  const currentBooked = Number(departure?.booked_count || 0);

  await supabaseAdmin
    .from("sundra_departures")
    .update({
      booked_count: currentBooked + Number(booking.passengers_count || 0),
      updated_at: new Date().toISOString(),
    })
    .eq("id", booking.departure_id);

  console.log(`Sundra booking ${booking.booking_number} markerad som betald.`);

  return {
    ok: true,
    type: "sundra",
    booking_number: booking.booking_number,
  };
}

async function handleShuttleBooking(checkoutReference: string, checkout: any) {
  const { data: booking, error: bookingError } = await supabaseAdmin
    .from("shuttle_bookings")
    .select("*")
    .eq("booking_number", checkoutReference)
    .maybeSingle();

  if (bookingError) throw bookingError;
  if (!booking) return null;

  const status = String(checkout?.status || "").toLowerCase();

  if (booking.payment_status === "paid") {
    return {
      ok: true,
      type: "shuttle",
      already_paid: true,
    };
  }

  const paymentReference =
    checkout?.id ||
    checkout?.transaction_id ||
    checkout?.payment_id ||
    checkoutReference;

  if (!isPaidStatus(status)) {
    const nextStatus = isFailedStatus(status)
      ? status === "failed"
        ? "payment_failed"
        : "cancelled"
      : "pending_payment";

    await supabaseAdmin
      .from("shuttle_bookings")
      .update({
        payment_status: isFailedStatus(status) ? status : "pending",
        status: nextStatus,
        payment_reference: paymentReference,
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking.id);

    await supabaseAdmin
      .from("shuttle_tickets")
      .update({
        payment_status: isFailedStatus(status) ? status : "pending",
        ticket_status: nextStatus,
        payment_reference: paymentReference,
        payment_method: "sumup",
        updated_at: new Date().toISOString(),
      })
      .eq("booking_id", booking.id);

    return {
      ok: true,
      type: "shuttle",
      ignored: true,
      status,
    };
  }

  await supabaseAdmin
    .from("shuttle_bookings")
    .update({
      payment_status: "paid",
      status: "confirmed",
      payment_reference: paymentReference,
      updated_at: new Date().toISOString(),
    })
    .eq("id", booking.id);

  await supabaseAdmin
    .from("shuttle_tickets")
    .update({
      payment_status: "paid",
      ticket_status: "active",
      payment_reference: paymentReference,
      payment_method: "sumup",
      updated_at: new Date().toISOString(),
    })
    .eq("booking_id", booking.id);

  if (booking.customer_email) {
    const { data: passenger } = await supabaseAdmin
      .from("shuttle_passengers")
      .select("id,total_trips,total_spent")
      .eq("customer_email", booking.customer_email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (passenger) {
      await supabaseAdmin
        .from("shuttle_passengers")
        .update({
          total_trips: Number(passenger.total_trips || 0) + 1,
          total_spent:
            Number(passenger.total_spent || 0) +
            Number(booking.total_amount || 0),
          last_trip_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", passenger.id);
    }
  }

  try {
    await sendShuttleBookingEmail(booking.id);
  } catch (mailError) {
    console.error("Shuttle mail error:", mailError);
  }

  console.log(`Shuttle booking ${booking.booking_number} markerad som betald.`);

  return {
    ok: true,
    type: "shuttle",
    booking_number: booking.booking_number,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
      });
    }

    const payload = req.body || {};

    console.log("SUMUP WEBHOOK:", payload);

    const checkoutId =
      payload?.id ||
      payload?.checkout_id ||
      payload?.checkoutReference ||
      payload?.checkout_reference;

    if (!checkoutId) {
      return res.status(400).json({
        ok: false,
        error: "Checkout ID saknas.",
      });
    }

    const checkout = await getCheckout(String(checkoutId));

    const checkoutReference =
      checkout?.checkout_reference ||
      payload?.checkout_reference ||
      payload?.reference;

    if (!checkoutReference) {
      throw new Error("checkout_reference saknas.");
    }

    const shuttleResult = await handleShuttleBooking(
      String(checkoutReference),
      checkout
    );

    if (shuttleResult) {
      return res.status(200).json(shuttleResult);
    }

    const sundraResult = await handleSundraBooking(
      String(checkoutReference),
      checkout
    );

    if (sundraResult) {
      return res.status(200).json(sundraResult);
    }

    return res.status(404).json({
      ok: false,
      error: "Ingen bokning hittades för checkout_reference.",
      checkout_reference: checkoutReference,
    });
  } catch (e: any) {
    console.error("sumup webhook error:", e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Webhook error",
    });
  }
}
