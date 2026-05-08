import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
      });
    }

    const departureId = String(req.query.departureId || "");

    if (!departureId) {
      return res.status(400).json({
        ok: false,
        error: "departureId saknas.",
      });
    }

    const { data: departure, error: depErr } = await supabase
      .from("sundra_departures")
      .select("*")
      .eq("id", departureId)
      .single();

    if (depErr || !departure) {
      return res.status(404).json({
        ok: false,
        error: "Avgången hittades inte.",
      });
    }

    const { data: trip } = await supabase
      .from("sundra_trips")
      .select("*")
      .eq("id", departure.trip_id)
      .single();

    const { data: bookings, error: bookingErr } = await supabase
      .from("sundra_bookings")
      .select("*")
      .eq("departure_id", departureId)
      .order("created_at", { ascending: true });

    if (bookingErr) throw bookingErr;

    const bookingIds = (bookings || []).map((b: any) => b.id);

    let passengers: any[] = [];
    let scans: any[] = [];

    if (bookingIds.length > 0) {
      const { data: passengerRows, error: passengerErr } = await supabase
        .from("sundra_booking_passengers")
        .select("*")
        .in("booking_id", bookingIds)
        .order("created_at", { ascending: true });

      if (passengerErr) throw passengerErr;

      passengers = passengerRows || [];

      const { data: scanRows, error: scanErr } = await supabase
        .from("sundra_ticket_scans")
        .select("*")
        .in("booking_id", bookingIds)
        .order("created_at", { ascending: false });

      if (scanErr) throw scanErr;

      scans = scanRows || [];
    }

    const scanCountByBooking = scans.reduce((acc: any, scan: any) => {
      acc[scan.booking_id] =
        (acc[scan.booking_id] || 0) + Number(scan.scanned_count || 0);
      return acc;
    }, {});

    const bookingById = (bookings || []).reduce((acc: any, booking: any) => {
      acc[booking.id] = booking;
      return acc;
    }, {});

    const passengerRows = passengers.map((p: any) => {
      const booking = bookingById[p.booking_id] || {};
      const checkedInCount = scanCountByBooking[p.booking_id] || 0;

      return {
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        passenger_type: p.passenger_type,
        seat_number: p.seat_number,
        special_requests: p.special_requests,

        booking_id: p.booking_id,
        booking_number: booking.booking_number,
        customer_name: booking.customer_name,
        payment_status: booking.payment_status,

        checked_in_count: checkedInCount,
      };
    });

    const passengersTotal =
      (bookings || []).reduce(
        (sum: number, b: any) => sum + Number(b.passengers_count || 0),
        0
      ) || passengers.length;

    const checkedInTotal = Object.values(scanCountByBooking).reduce(
      (sum: number, value: any) => sum + Number(value || 0),
      0
    );

    return res.status(200).json({
      ok: true,
      departure,
      trip,
      bookings: bookings || [],
      passengers: passengerRows,
      stats: {
        passengers_total: passengersTotal,
        checked_in_total: checkedInTotal,
        remaining_total: Math.max(0, passengersTotal - checkedInTotal),
        bookings_total: bookings?.length || 0,
      },
    });
  } catch (e: any) {
    console.error("/api/admin/sundra/boarding/[departureId] error:", e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte hämta boardingläge.",
    });
  }
}
