import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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
    throw new Error(
      json?.message || "Kunde inte hämta SumUp checkout."
    );
  }

  return json;
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
      payload?.checkout_reference;

    if (!checkoutId) {
      return res.status(400).json({
        ok: false,
        error: "Checkout ID saknas.",
      });
    }

    const checkout = await getCheckout(checkoutId);

    const checkoutReference = checkout?.checkout_reference;

    if (!checkoutReference) {
      throw new Error("checkout_reference saknas.");
    }

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
      .single();

    if (bookingError) throw bookingError;

    if (!booking) {
      throw new Error("Bokning hittades inte.");
    }

    const status = String(checkout?.status || "").toLowerCase();

    if (
      status !== "paid" &&
      status !== "successful" &&
      status !== "succeeded"
    ) {
      return res.status(200).json({
        ok: true,
        ignored: true,
        status,
      });
    }

    if (booking.payment_status === "paid") {
      return res.status(200).json({
        ok: true,
        already_paid: true,
      });
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
        booked_count:
          currentBooked + Number(booking.passengers_count || 0),

        updated_at: new Date().toISOString(),
      })
      .eq("id", booking.departure_id);

    console.log(
      `Booking ${booking.booking_number} markerad som betald.`
    );

    return res.status(200).json({
      ok: true,
    });
  } catch (e: any) {
    console.error("sumup webhook error:", e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Webhook error",
    });
  }
}
