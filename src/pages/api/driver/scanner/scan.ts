import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function getBearerToken(req: NextApiRequest) {
  const header = String(req.headers.authorization || "");
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function createAuthedClient(req: NextApiRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase URL eller anon key saknas.");
  }

  const token = getBearerToken(req);

  return createClient(url, anonKey, {
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  });
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function clean(value: any) {
  return String(value || "").trim();
}

function normalizeQrCandidates(qrData: string) {
  const raw = clean(qrData);
  const candidates = new Set<string>();

  if (raw) candidates.add(raw);

  try {
    const parsedJson = JSON.parse(raw);

    for (const key of [
      "booking_number",
      "bookingNumber",
      "ticket_hash",
      "ticketHash",
      "hash",
      "code",
      "ticket",
      "id",
    ]) {
      if (parsedJson?.[key]) candidates.add(clean(parsedJson[key]));
    }
  } catch {
    // QR är inte JSON.
  }

  try {
    const url = new URL(raw);

    for (const key of [
      "booking_number",
      "bookingNumber",
      "booking",
      "ticket_hash",
      "ticketHash",
      "hash",
      "code",
      "ticket",
      "id",
      "t",
    ]) {
      const value = url.searchParams.get(key);
      if (value) candidates.add(clean(value));
    }

    const parts = url.pathname.split("/").map(clean).filter(Boolean);
    for (const part of parts) {
      if (part.startsWith("SU") || part.length > 12 || isUuid(part)) {
        candidates.add(part);
      }
    }
  } catch {
    // QR är inte URL.
  }

  const suMatch = raw.match(/SU\d{6,}/i);
  if (suMatch?.[0]) candidates.add(suMatch[0].toUpperCase());

  return Array.from(candidates).filter(Boolean);
}

async function getAuthedUser(req: NextApiRequest) {
  const token = getBearerToken(req);

  if (!token) {
    return {
      userId: null,
      email: null,
    };
  }

  const supabase = createAuthedClient(req);
  const { data } = await supabase.auth.getUser();

  return {
    userId: data?.user?.id || null,
    email: data?.user?.email || null,
  };
}

async function findSundraBooking(qrData: string) {
  const candidates = normalizeQrCandidates(qrData);

  for (const candidate of candidates) {
    const candidateUpper = candidate.toUpperCase();

    let query = supabaseAdmin
      .from("sundra_bookings")
      .select("*")
      .limit(1);

    if (candidateUpper.startsWith("SU")) {
      query = query.eq("booking_number", candidateUpper);
    } else if (isUuid(candidate)) {
      query = query.eq("id", candidate);
    } else {
      query = query.eq("ticket_hash", candidate);
    }

    const { data, error } = await query.maybeSingle();

    if (!error && data) {
      return data;
    }
  }

  return null;
}

function isInactiveBooking(booking: any) {
  const status = String(booking?.status || "").toLowerCase();
  const paymentStatus = String(booking?.payment_status || "").toLowerCase();

  const inactive = new Set([
    "cancelled",
    "canceled",
    "expired",
    "failed",
    "refunded",
    "deleted",
    "void",
  ]);

  return inactive.has(status) || inactive.has(paymentStatus);
}

function isPaidBooking(booking: any) {
  return String(booking?.payment_status || "").toLowerCase() === "paid";
}

async function getTripAndDeparture(booking: any) {
  let trip: any = null;
  let departure: any = null;

  if (booking?.trip_id) {
    const { data } = await supabaseAdmin
      .from("sundra_trips")
      .select("id,title,destination")
      .eq("id", booking.trip_id)
      .maybeSingle();

    trip = data || null;
  }

  if (booking?.departure_id) {
    const { data } = await supabaseAdmin
      .from("sundra_departures")
      .select("id,departure_date,departure_time,return_time")
      .eq("id", booking.departure_id)
      .maybeSingle();

    departure = data || null;
  }

  return { trip, departure };
}

async function getPassengers(bookingId: string) {
  const { data } = await supabaseAdmin
    .from("sundra_booking_passengers")
    .select("id,first_name,last_name,seat_number,passenger_type")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });

  return data || [];
}

async function saveScan(payload: any) {
  const { error } = await supabaseAdmin.from("driver_ticket_scans").insert(payload);

  if (error) {
    console.error("driver_ticket_scans insert error:", error);
  }
}

function passengerName(passengers: any[], booking: any) {
  const first = passengers?.[0];

  const name = [first?.first_name, first?.last_name].filter(Boolean).join(" ").trim();

  return name || booking?.customer_name || "Passagerare";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      status: "invalid",
      title: "Fel metod",
      message: "Endast POST är tillåtet.",
    });
  }

  try {
    const { qrData, expectedDepartureId = null } = req.body || {};
    const rawQr = clean(qrData);

    if (!rawQr) {
      return res.status(400).json({
        ok: false,
        status: "invalid",
        title: "Ingen QR-kod",
        message: "Ingen biljettdata hittades i QR-koden.",
      });
    }

    const authedUser = await getAuthedUser(req);
    const booking = await findSundraBooking(rawQr);

    if (!booking) {
      await saveScan({
        ticket_type: "sundra",
        qr_data: rawQr,
        result: "invalid",
        reason: "not_found",
        driver_user_id: authedUser.userId,
        driver_email: authedUser.email,
      });

      return res.status(200).json({
        ok: false,
        status: "invalid",
        title: "Ogiltig biljett",
        message: "Biljetten kunde inte hittas eller känns inte igen.",
      });
    }

    const { data: existingApproved } = await supabaseAdmin
      .from("driver_ticket_scans")
      .select("*")
      .eq("booking_id", booking.id)
      .eq("result", "approved")
      .order("scanned_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { trip, departure } = await getTripAndDeparture(booking);
    const passengers = await getPassengers(booking.id);

    if (existingApproved) {
      await saveScan({
        ticket_type: "sundra",
        booking_id: booking.id,
        booking_number: booking.booking_number,
        ticket_hash: booking.ticket_hash || null,
        qr_data: rawQr,
        result: "already_used",
        reason: "already_scanned",
        driver_user_id: authedUser.userId,
        driver_email: authedUser.email,
        data: {
          first_scanned_at: existingApproved.scanned_at,
        },
      });

      return res.status(200).json({
        ok: false,
        status: "already_used",
        title: "Biljetten är redan använd",
        message: "Denna biljett har redan scannats tidigare.",
        firstScannedAt: existingApproved.scanned_at,
        bookingNumber: booking.booking_number,
        passengerName: passengerName(passengers, booking),
        tripTitle: trip?.title || "Sundra resa",
        seatNumbers: passengers.map((p: any) => p.seat_number).filter(Boolean),
      });
    }

    if (isInactiveBooking(booking)) {
      await saveScan({
        ticket_type: "sundra",
        booking_id: booking.id,
        booking_number: booking.booking_number,
        ticket_hash: booking.ticket_hash || null,
        qr_data: rawQr,
        result: "invalid",
        reason: "inactive_booking",
        driver_user_id: authedUser.userId,
        driver_email: authedUser.email,
      });

      return res.status(200).json({
        ok: false,
        status: "invalid",
        title: "Biljetten gäller inte",
        message: "Bokningen är avbokad, utgången eller återbetald.",
        bookingNumber: booking.booking_number,
      });
    }

    if (!isPaidBooking(booking)) {
      await saveScan({
        ticket_type: "sundra",
        booking_id: booking.id,
        booking_number: booking.booking_number,
        ticket_hash: booking.ticket_hash || null,
        qr_data: rawQr,
        result: "invalid",
        reason: "not_paid",
        driver_user_id: authedUser.userId,
        driver_email: authedUser.email,
      });

      return res.status(200).json({
        ok: false,
        status: "not_paid",
        title: "Biljetten är inte betald",
        message: "Bokningen finns, men betalningen är inte registrerad som betald.",
        bookingNumber: booking.booking_number,
        passengerName: passengerName(passengers, booking),
        tripTitle: trip?.title || "Sundra resa",
      });
    }

    if (expectedDepartureId && String(booking.departure_id) !== String(expectedDepartureId)) {
      await saveScan({
        ticket_type: "sundra",
        booking_id: booking.id,
        booking_number: booking.booking_number,
        ticket_hash: booking.ticket_hash || null,
        qr_data: rawQr,
        result: "wrong_departure",
        reason: "wrong_departure",
        driver_user_id: authedUser.userId,
        driver_email: authedUser.email,
        data: {
          expectedDepartureId,
          actualDepartureId: booking.departure_id,
        },
      });

      return res.status(200).json({
        ok: false,
        status: "wrong_departure",
        title: "Fel avgång",
        message: "Biljetten är giltig, men gäller inte denna avgång.",
        bookingNumber: booking.booking_number,
        passengerName: passengerName(passengers, booking),
        tripTitle: trip?.title || "Sundra resa",
      });
    }

    await saveScan({
      ticket_type: "sundra",
      booking_id: booking.id,
      booking_number: booking.booking_number,
      ticket_hash: booking.ticket_hash || null,
      qr_data: rawQr,
      result: "approved",
      reason: "checked_in",
      driver_user_id: authedUser.userId,
      driver_email: authedUser.email,
      data: {
        trip_id: booking.trip_id,
        departure_id: booking.departure_id,
      },
    });

    return res.status(200).json({
      ok: true,
      status: "approved",
      title: "Biljett godkänd",
      message: "Biljetten är giltig och passageraren är incheckad.",
      bookingNumber: booking.booking_number,
      passengerName: passengerName(passengers, booking),
      tripTitle: trip?.title || "Sundra resa",
      departureDate: departure?.departure_date || null,
      departureTime: departure?.departure_time || null,
      seatNumbers: passengers.map((p: any) => p.seat_number).filter(Boolean),
      passengerCount: booking.passengers_count || passengers.length || 1,
    });
  } catch (error: any) {
    console.error("/api/driver/scanner/scan error:", error);

    return res.status(500).json({
      ok: false,
      status: "invalid",
      title: "Tekniskt fel",
      message: error?.message || "Kunde inte kontrollera biljetten.",
    });
  }
}
