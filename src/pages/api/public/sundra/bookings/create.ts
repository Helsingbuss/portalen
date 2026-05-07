import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function toNumber(value: any, fallback = 0) {
  if (value === "" || value === null || value === undefined) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function makeBookingNumber() {
  const year = new Date().getFullYear().toString().slice(-2);
  const random = Math.floor(100000 + Math.random() * 900000);
  return `SU${year}${random}`;
}

function cleanPassenger(p: any) {
  return {
    first_name: p?.first_name || null,
    last_name: p?.last_name || null,
    passenger_type: p?.passenger_type || "adult",
    date_of_birth: p?.date_of_birth || null,
    special_requests: p?.special_requests || null,
  };
}

function baseUrl() {
  const raw =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_CUSTOMER_BASE_URL ||
    process.env.CUSTOMER_BASE_URL ||
    "http://localhost:3000";

  return raw.replace(/\/$/, "");
}

async function createSumUpCheckout({
  bookingId,
  bookingNumber,
  amount,
  currency,
  description,
}: {
  bookingId: string;
  bookingNumber: string;
  amount: number;
  currency: string;
  description: string;
}) {
  const apiKey = process.env.SUMUP_API_KEY;
  const merchantCode = process.env.SUMUP_MERCHANT_CODE;

  if (!apiKey) {
    throw new Error("SUMUP_API_KEY saknas i env.");
  }

  if (!merchantCode) {
    throw new Error("SUMUP_MERCHANT_CODE saknas i env.");
  }

  const successUrl = `${baseUrl()}/boka/bekraftelse/${bookingId}?payment=sumup`;
  const cancelUrl = `${baseUrl()}/boka/bekraftelse/${bookingId}?payment=cancelled`;

  const response = await fetch("https://api.sumup.com/v0.1/checkouts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      checkout_reference: bookingNumber,
      amount: Number(amount.toFixed(2)),
      currency,
      merchant_code: merchantCode,
      description,
      return_url: successUrl,
      redirect_url: successUrl,
      pay_to_email: undefined,
    }),
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error("SumUp checkout error:", json);
    throw new Error(json?.message || json?.error || "Kunde inte skapa SumUp-betalning.");
  }

  return {
    id: json.id,
    checkout_reference: json.checkout_reference,
    checkout_url: json.checkout_url || json.redirect_url || json.hosted_checkout_url || null,
    raw: json,
    cancel_url: cancelUrl,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
      });
    }

    const body = req.body || {};

    if (!body.trip_id || !body.departure_id) {
      return res.status(400).json({
        ok: false,
        error: "Resa eller avgång saknas.",
      });
    }

    if (!body.customer_name || !body.customer_email || !body.customer_phone) {
      return res.status(400).json({
        ok: false,
        error: "Kunduppgifter saknas.",
      });
    }

    const passengersCount = Math.max(1, toNumber(body.passengers_count, 1));

    const { data: departure, error: depError } = await supabaseAdmin
      .from("sundra_departures")
      .select(`
        id,
        trip_id,
        price,
        capacity,
        booked_count,
        status,
        sundra_trips (
          id,
          title,
          slug,
          currency
        )
      `)
      .eq("id", body.departure_id)
      .single();

    if (depError) throw depError;

    if (!departure) {
      return res.status(404).json({
        ok: false,
        error: "Avgången hittades inte.",
      });
    }

    if (departure.status !== "open") {
      return res.status(400).json({
        ok: false,
        error: "Avgången är inte bokningsbar.",
      });
    }

    if (String(departure.trip_id) !== String(body.trip_id)) {
      return res.status(400).json({
        ok: false,
        error: "Avgången matchar inte vald resa.",
      });
    }

    const seatsLeft =
      Number(departure.capacity || 0) - Number(departure.booked_count || 0);

    if (seatsLeft < passengersCount) {
      return res.status(400).json({
        ok: false,
        error: `Det finns bara ${Math.max(0, seatsLeft)} platser kvar.`,
      });
    }

    const trip: any = Array.isArray(departure.sundra_trips)
      ? departure.sundra_trips[0]
      : departure.sundra_trips;

    const unitPrice = toNumber(departure.price, 0);
    const subtotal = unitPrice * passengersCount;
    const optionsTotal = toNumber(body.options_total, 0);
    const roomTotal = toNumber(body.room_total, 0);
    const totalAmount = subtotal + optionsTotal + roomTotal;
    const currency = body.currency || trip?.currency || "SEK";

    const bookingNumber = makeBookingNumber();

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("sundra_bookings")
      .insert({
        booking_number: bookingNumber,
        trip_id: body.trip_id,
        departure_id: body.departure_id,

        status: "pending_payment",

        customer_name: body.customer_name,
        customer_email: body.customer_email,
        customer_phone: body.customer_phone,
        customer_address: body.customer_address || null,

        passengers_count: passengersCount,
        selected_room_id: body.selected_room_id || null,

        subtotal,
        options_total: optionsTotal,
        room_total: roomTotal,
        total_amount: totalAmount,
        currency,

        payment_status: "unpaid",
        payment_reference: null,

        notes: body.notes || null,

        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (bookingError) throw bookingError;

    const passengers = Array.isArray(body.passengers) ? body.passengers : [];

    if (passengers.length > 0) {
      const passengerRows = passengers.map((p: any) => ({
        booking_id: booking.id,
        ...cleanPassenger(p),
      }));

      const { error: passengerError } = await supabaseAdmin
        .from("sundra_booking_passengers")
        .insert(passengerRows);

      if (passengerError) throw passengerError;
    }

    const { error: depUpdateError } = await supabaseAdmin
      .from("sundra_departures")
      .update({
        booked_count: Number(departure.booked_count || 0) + passengersCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.departure_id);

    if (depUpdateError) throw depUpdateError;

    const sumup = await createSumUpCheckout({
      bookingId: booking.id,
      bookingNumber: booking.booking_number,
      amount: totalAmount,
      currency,
      description: `${trip?.title || "Sundra resa"} - ${booking.booking_number}`,
    });

    await supabaseAdmin
      .from("sundra_bookings")
      .update({
        payment_reference: sumup.id || sumup.checkout_reference || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking.id);

    return res.status(201).json({
      ok: true,
      booking,
      booking_id: booking.id,
      booking_number: booking.booking_number,

      checkout_url: sumup.checkout_url,
      payment_url: sumup.checkout_url,
      sumup_checkout_id: sumup.id,

      redirect_url: `/boka/bekraftelse/${booking.id}`,
    });
  } catch (e: any) {
    console.error("/api/public/sundra/bookings/create error:", e?.message || e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte skapa bokningen.",
    });
  }
}
