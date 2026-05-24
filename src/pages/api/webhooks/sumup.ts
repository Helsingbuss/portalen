import type { NextApiRequest, NextApiResponse } from "next";
import { sendSundraBookingConfirmation } from "@/lib/email/sendSundraBookingConfirmation";
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
  const status = String(checkout?.status || "").toLowerCase();

  let storeOrder: any = null;

  const { data: storeOrderByReference } = await supabaseAdmin
    .from("app_store_orders")
    .select("*")
    .eq("order_reference", checkoutReference)
    .maybeSingle();

  if (storeOrderByReference) {
    storeOrder = storeOrderByReference;
  } else {
    const { data: storeOrderByCheckoutReference } = await supabaseAdmin
      .from("app_store_orders")
      .select("*")
      .eq("sumup_checkout_reference", checkoutReference)
      .maybeSingle();

    storeOrder = storeOrderByCheckoutReference || null;
  }

  let booking: any = null;

  const isAgentSundraOrder =
    storeOrder &&
    [
      "agent_sundra_booking",
      "sundra_booking",
      "trip_ticket",
    ].includes(String(storeOrder.source_type || ""));

  if (isAgentSundraOrder && storeOrder.source_id) {
    const { data, error } = await supabaseAdmin
      .from("sundra_bookings")
      .select("*")
      .eq("id", storeOrder.source_id)
      .maybeSingle();

    if (error) throw error;
    booking = data || null;
  }

  if (!booking) {
    const { data, error } = await supabaseAdmin
      .from("sundra_bookings")
      .select("*")
      .eq("booking_number", checkoutReference)
      .maybeSingle();

    if (error) throw error;
    booking = data || null;
  }

  if (!booking) return null;

  if (!isPaidStatus(status)) {
    if (storeOrder?.id) {
      await supabaseAdmin
        .from("app_store_orders")
        .update({
          status: status || "pending",
          sumup_status: status || checkout?.status || "pending",
          sumup_raw: checkout,
          updated_at: new Date().toISOString(),
        })
        .eq("id", storeOrder.id);
    }

    return {
      ok: true,
      type: "sundra",
      ignored: true,
      status,
      checkout_reference: checkoutReference,
      booking_id: booking.id,
      store_order_id: storeOrder?.id || null,
    };
  }

  if (booking.payment_status === "paid") {
    return {
      ok: true,
      type: "sundra",
      already_paid: true,
      booking_id: booking.id,
      booking_number: booking.booking_number,
      store_order_id: storeOrder?.id || null,
    };
  }

  const paymentReference =
    checkout?.id ||
    checkout?.transaction_id ||
    checkout?.payment_id ||
    checkoutReference;

  const { data: updatedBooking, error: updateError } = await supabaseAdmin
    .from("sundra_bookings")
    .update({
      payment_status: "paid",
      status: "confirmed",
      payment_reference: paymentReference,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", booking.id)
    .select("*")
    .single();

  if (updateError) throw updateError;

  if (storeOrder?.id) {
    await supabaseAdmin
      .from("app_store_orders")
      .update({
        status: "paid",
        sumup_status: checkout?.status || "paid",
        sumup_checkout_id: checkout?.id || storeOrder.sumup_checkout_id || null,
        sumup_payment_url:
          checkout?.hosted_checkout_url ||
          checkout?.checkout_url ||
          storeOrder.sumup_payment_url ||
          null,
        sumup_raw: checkout,
        updated_at: new Date().toISOString(),
      })
      .eq("id", storeOrder.id);
  }

  let ticketEmail: any = {
    sent: false,
    skipped: true,
    error: null,
  };

  if (updatedBooking?.customer_email) {
    try {
      const { data: trip } = updatedBooking.trip_id
        ? await supabaseAdmin
            .from("sundra_trips")
            .select("*")
            .eq("id", updatedBooking.trip_id)
            .maybeSingle()
        : { data: null };

      const { data: departure } = updatedBooking.departure_id
        ? await supabaseAdmin
            .from("sundra_departures")
            .select("*")
            .eq("id", updatedBooking.departure_id)
            .maybeSingle()
        : { data: null };

      const { data: passengers } = await supabaseAdmin
        .from("sundra_passengers")
        .select("*")
        .eq("booking_id", updatedBooking.id)
        .order("created_at", { ascending: true });

      await sendSundraBookingConfirmation({
        to: updatedBooking.customer_email,
        booking: {
          id: updatedBooking.id,
          booking_number: updatedBooking.booking_number,
          customer_name: updatedBooking.customer_name,
          customer_email: updatedBooking.customer_email,
          customer_phone: updatedBooking.customer_phone,
          passengers_count:
            updatedBooking.passengers_count ||
            passengers?.length ||
            0,
          total_amount: updatedBooking.total_amount,
          currency: updatedBooking.currency || "SEK",
          payment_status: "paid",
          ticket_hash: updatedBooking.ticket_hash || null,
        },
        trip: trip
          ? {
              title: trip.title,
              destination: trip.destination,
              image_url: trip.image_url,
            }
          : undefined,
        departure: departure
          ? {
              departure_date: departure.departure_date,
              departure_time: departure.departure_time,
              return_time: departure.return_time,
            }
          : undefined,
        passengers: passengers || [],
      } as any);

      ticketEmail = {
        sent: true,
        skipped: false,
        to: updatedBooking.customer_email,
      };
    } catch (error: any) {
      ticketEmail = {
        sent: false,
        skipped: false,
        error: error?.message || "Kunde inte skicka biljettmail.",
      };

      console.error("[sumup webhook] Sundra biljettmail error:", error);
    }
  } else {
    ticketEmail.reason = "missing_customer_email";
  }

  return {
    ok: true,
    type: "sundra",
    paid: true,
    booking_id: updatedBooking.id,
    booking_number: updatedBooking.booking_number,
    store_order_id: storeOrder?.id || null,
    ticket_email: ticketEmail,
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
