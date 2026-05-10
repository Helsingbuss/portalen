import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { departureId } = req.query;

    if (
      !departureId ||
      typeof departureId !== "string"
    ) {
      return res.status(400).json({
        ok: false,
        error:
          "departureId saknas.",
      });
    }

    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        error:
          "Method not allowed",
      });
    }

    // =========================
    // AVGÅNG
    // =========================
    const {
      data: departure,
      error: departureError,
    } = await supabase
      .from("sundra_departures")
      .select(`
        *,
        sundra_trips (
          id,
          title,
          destination
        )
      `)
      .eq("id", departureId)
      .single();

    if (departureError) {
      throw departureError;
    }

    // =========================
    // BOOKINGS
    // =========================
    const {
      data: bookings,
      error: bookingsError,
    } = await supabase
      .from("sundra_bookings")
      .select(`
        id,
        booking_number,
        customer_name,
        payment_status,
        passengers_count
      `)
      .eq(
        "departure_id",
        departureId
      );

    if (bookingsError) {
      throw bookingsError;
    }

    // =========================
    // TOTALER
    // =========================
    const totalBooked =
      (bookings || []).reduce(
        (
          sum: number,
          booking: any
        ) =>
          sum +
          Number(
            booking.passengers_count ||
              0
          ),
        0
      );

    const capacity =
      Number(
        departure.capacity || 0
      );

    const remaining =
      Math.max(
        0,
        capacity - totalBooked
      );

    const occupancyPercent =
      capacity > 0
        ? Math.round(
            (totalBooked /
              capacity) *
              100
          )
        : 0;

    // =========================
    // STATUS
    // =========================
    let occupancyStatus =
      "low";

    if (
      occupancyPercent >= 90
    ) {
      occupancyStatus =
        "full";
    } else if (
      occupancyPercent >= 70
    ) {
      occupancyStatus =
        "high";
    } else if (
      occupancyPercent >= 40
    ) {
      occupancyStatus =
        "medium";
    }

    return res.status(200).json({
      ok: true,

      departure,

      bookings:
        bookings || [],

      stats: {
        capacity,

        booked:
          totalBooked,

        remaining,

        occupancy_percent:
          occupancyPercent,

        occupancy_status:
          occupancyStatus,
      },
    });
  } catch (e: any) {
    console.error(
      "/api/admin/sundra/capacity/[departureId] error:",
      e
    );

    return res.status(500).json({
      ok: false,
      error:
        e?.message ||
        "Kunde inte hämta kapacitet.",
    });
  }
}
