import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function isUuidLike(value: any) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(value || "").trim()
  );
}

function isSundraNumber(value: any) {
  return /^SU\d{6,}$/i.test(String(value || "").trim());
}

function getBaseUrl(req: NextApiRequest) {
  const envBase =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_CUSTOMER_BASE_URL ||
    process.env.CUSTOMER_BASE_URL ||
    process.env.VERCEL_URL ||
    "";

  if (envBase) {
    return envBase.startsWith("http")
      ? envBase.replace(/\/$/, "")
      : `https://${envBase.replace(/\/$/, "")}`;
  }

  const proto = String(req.headers["x-forwarded-proto"] || "https");
  const host = String(req.headers.host || "");

  return `${proto}://${host}`;
}

async function findOrder(reference: string) {
  const { data, error } = await supabaseAdmin
    .from("app_store_orders")
    .select("*")
    .or(
      `order_reference.eq.${reference},sumup_checkout_reference.eq.${reference},sumup_checkout_id.eq.${reference}`
    )
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data || null;
}

async function findBookingFromOrder(order: any) {
  const sourceId = String(order?.source_id || "").trim();
  const orderReference = String(order?.order_reference || "").trim();
  const checkoutReference = String(order?.sumup_checkout_reference || "").trim();
  const customerEmail = String(order?.customer_email || "").trim();

  if (isUuidLike(sourceId)) {
    const { data } = await supabaseAdmin
      .from("sundra_bookings")
      .select("*")
      .eq("id", sourceId)
      .limit(1)
      .maybeSingle();

    if (data) return data;
  }

  for (const value of [sourceId, orderReference, checkoutReference]) {
    if (isSundraNumber(value)) {
      const { data } = await supabaseAdmin
        .from("sundra_bookings")
        .select("*")
        .eq("booking_number", value.toUpperCase())
        .limit(1)
        .maybeSingle();

      if (data) return data;
    }
  }

  if (customerEmail) {
    const { data } = await supabaseAdmin
      .from("sundra_bookings")
      .select("*")
      .ilike("customer_email", customerEmail)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) return data;
  }

  return null;
}

async function markPaidAndLinkOrder(order: any, booking: any) {
  await supabaseAdmin
    .from("sundra_bookings")
    .update({
      payment_status: "paid",
      status: "confirmed",
      paid_at: booking.paid_at || new Date().toISOString(),
    })
    .eq("id", booking.id);

  await supabaseAdmin
    .from("app_store_orders")
    .update({
      source_id: String(booking.id),
      order_reference: booking.booking_number,
      sumup_checkout_reference: booking.booking_number,
      status: "paid",
      sumup_status: "paid",
    })
    .eq("id", order.id);
}

async function sendTicket(req: NextApiRequest, bookingId: string) {
  const baseUrl = getBaseUrl(req);

  const response = await fetch(
    `${baseUrl}/api/admin/sundra/bookings/send-ticket`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        booking_id: bookingId,
        reason: "manual_paid_booking_by_payment_reference",
      }),
    }
  );

  const json = await response.json().catch(() => ({}));

  return {
    ok: response.ok && json?.ok !== false,
    status: response.status,
    response: json,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  try {
    const reference = String(
      req.body?.order_reference ||
        req.body?.payment_reference ||
        req.body?.reference ||
        ""
    ).trim();

    if (!reference) {
      return res.status(400).json({
        ok: false,
        error: "order_reference saknas.",
      });
    }

    const order = await findOrder(reference);

    if (!order) {
      return res.status(404).json({
        ok: false,
        error: "Betalningen hittades inte.",
        reference,
      });
    }

    const booking = await findBookingFromOrder(order);

    if (!booking) {
      return res.status(404).json({
        ok: false,
        error: "Ingen Sundra-bokning kunde kopplas till betalningen.",
        payment: {
          id: order.id,
          order_reference: order.order_reference,
          sumup_checkout_reference: order.sumup_checkout_reference,
          source_type: order.source_type,
          source_id: order.source_id,
          customer_email: order.customer_email,
          status: order.status,
          sumup_status: order.sumup_status,
        },
      });
    }

    await markPaidAndLinkOrder(order, booking);

    const ticketResult = await sendTicket(req, String(booking.id));

    return res.status(ticketResult.ok ? 200 : 500).json({
      ok: ticketResult.ok,
      booking: {
        id: booking.id,
        booking_number: booking.booking_number,
        customer_email: booking.customer_email,
      },
      ticket: ticketResult,
    });
  } catch (error: any) {
    console.error("send-ticket-by-payment error:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte skicka biljett via betalreferens.",
    });
  }
}
