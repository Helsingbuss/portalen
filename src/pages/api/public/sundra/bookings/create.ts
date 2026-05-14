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

function baseUrl() {
  const raw =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_CUSTOMER_BASE_URL ||
    process.env.CUSTOMER_BASE_URL ||
    "http://localhost:3000";

  return raw.replace(/\/$/, "");
}

function cleanPassenger(p: any) {
  return {
    first_name: p?.first_name || null,
    last_name: p?.last_name || null,
    passenger_type: p?.passenger_type || "adult",
    date_of_birth: p?.date_of_birth || null,
    special_requests: p?.special_requests || null,
    seat_number: p?.seat_number || null,
    seat_price: toNumber(p?.seat_price, 0),
  };
}

function buildPassengers(bodyPassengers: any[], passengersCount: number, customerName: string) {
  return Array.from({ length: passengersCount }).map((_, index) => {
    const existing = bodyPassengers[index] || {};
    const fallbackName = index === 0 ? customerName : "";

    if (existing.first_name || existing.last_name) {
      return cleanPassenger(existing);
    }

    const parts = fallbackName.trim().split(" ").filter(Boolean);
    const firstName = parts[0] || null;
    const lastName = parts.slice(1).join(" ") || null;

    return cleanPassenger({
      ...existing,
      first_name: firstName,
      last_name: lastName,
    });
  });
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

  if (!apiKey) throw new Error("SUMUP_API_KEY saknas i env.");
  if (!merchantCode) throw new Error("SUMUP_MERCHANT_CODE saknas i env.");

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

async function validateSelectedSeats({
  departureId,
  passengers,
}: {
  departureId: string;
  passengers: any[];
}) {
  const selectedSeats = passengers.map((p) => p?.seat_number).filter(Boolean);

  if (selectedSeats.length === 0) return;

  const uniqueSeats = new Set(selectedSeats);

  if (uniqueSeats.size !== selectedSeats.length) {
    throw new Error("Samma säte har valts flera gånger.");
  }

  const { data: occupiedPassengers, error } = await supabaseAdmin
    .from("sundra_booking_passengers")
    .select(`
      id,
      seat_number,
      sundra_bookings (
        id,
        departure_id,
        status
      )
    `)
    .in("seat_number", selectedSeats);

  if (error) throw error;

  const occupied = (occupiedPassengers || []).filter((p: any) => {
    const booking = Array.isArray(p.sundra_bookings)
      ? p.sundra_bookings[0]
      : p.sundra_bookings;

    return booking?.departure_id === departureId && booking?.status !== "cancelled";
  });

  if (occupied.length > 0) {
    throw new Error(
      `Säte ${occupied.map((p: any) => p.seat_number).join(", ")} är redan bokat.`
    );
  }
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
    const bodyPassengers = Array.isArray(body.passengers) ? body.passengers : [];
    const passengers = buildPassengers(bodyPassengers, passengersCount, body.customer_name);

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

    await validateSelectedSeats({
      departureId: body.departure_id,
      passengers,
    });

    const trip: any = Array.isArray(departure.sundra_trips)
      ? departure.sundra_trips[0]
      : departure.sundra_trips;

    const unitPrice = toNumber(departure.price, 0);
    const subtotal = unitPrice * passengersCount;

    const optionsTotal = toNumber(body.options_total, 0);
    const roomTotal = toNumber(body.room_total, 0);

    const seatExtraTotal = passengers.reduce(
      (sum: number, p: any) => sum + toNumber(p?.seat_price, 0),
      0
    );

    const discountAmount = toNumber(body.discount_amount, 0);

    const totalAmount = Math.max(
      0,
      subtotal + optionsTotal + roomTotal + seatExtraTotal - discountAmount
    );

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
        seat_extra_total: seatExtraTotal,

        discount_code: body.discount_code || null,
        discount_amount: discountAmount,

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

    const passengerRows = passengers.map((p: any) => ({
      booking_id: booking.id,
      ...cleanPassenger(p),
    }));

    const { error: passengerError } = await supabaseAdmin
      .from("sundra_booking_passengers")
      .insert(passengerRows);

    if (passengerError) throw passengerError;

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
