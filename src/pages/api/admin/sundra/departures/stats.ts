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
    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        error:
          "Method not allowed",
      });
    }

    // =========================
    // AVGÅNGAR
    // =========================
    const {
      data: departures,
      error: departuresError,
    } = await supabase
      .from("sundra_departures")
      .select(`
        id,
        capacity,
        booked_count,
        status,
        departure_date
      `);

    if (departuresError) {
      throw departuresError;
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
        total_amount,
        payment_status,
        passengers_count
      `);

    if (bookingsError) {
      throw bookingsError;
    }

    // =========================
    // TOTALER
    // =========================
    const totalDepartures =
      departures?.length || 0;

    const activeDepartures =
      departures?.filter(
        (d: any) =>
          d.status === "open"
      ).length || 0;

    const totalCapacity =
      departures?.reduce(
        (
          sum: number,
          d: any
        ) =>
          sum +
          Number(
            d.capacity || 0
          ),
        0
      ) || 0;

    const totalBooked =
      bookings?.reduce(
        (
          sum: number,
          b: any
        ) =>
          sum +
          Number(
            b.passengers_count ||
              0
          ),
        0
      ) || 0;

    const paidBookings =
      bookings?.filter(
        (b: any) =>
          b.payment_status ===
          "paid"
      ) || [];

    const totalRevenue =
      paidBookings.reduce(
        (
          sum: number,
          b: any
        ) =>
          sum +
          Number(
            b.total_amount ||
              0
          ),
        0
      );

    const occupancy =
      totalCapacity > 0
        ? Math.round(
            (totalBooked /
              totalCapacity) *
              100
          )
        : 0;

    return res.status(200).json({
      ok: true,

      stats: {
        total_departures:
          totalDepartures,

        active_departures:
          activeDepartures,

        total_capacity:
          totalCapacity,

        booked_passengers:
          totalBooked,

        occupancy_percent:
          occupancy,

        total_revenue:
          totalRevenue,

        paid_bookings:
          paidBookings.length,
      },
    });
  } catch (e: any) {
    console.error(
      "/api/admin/sundra/departures/stats error:",
      e
    );

    return res.status(500).json({
      ok: false,
      error:
        e?.message ||
        "Kunde inte hämta statistik.",
    });
  }
}
