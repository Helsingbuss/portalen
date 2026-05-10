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
        error: "departureId saknas.",
      });
    }

    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
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
          destination,
          image_url
        ),
        sundra_lines (
          id,
          name,
          code,
          color
        )
      `)
      .eq("id", departureId)
      .single();

    if (departureError) {
      throw departureError;
    }

    // =========================
    // BOKNINGAR
    // =========================
    const {
      data: bookings,
      error: bookingsError,
    } = await supabase
      .from("sundra_bookings")
      .select(`
        *,
        sundra_booking_passengers (
          id,
          first_name,
          last_name,
          passenger_type,
          seat_number
        )
      `)
      .eq("departure_id", departureId)
      .order("created_at", {
        ascending: true,
      });

    if (bookingsError) {
      throw bookingsError;
    }

    // =========================
    // SCANS
    // =========================
    const {
      data: scans,
      error: scansError,
    } = await supabase
      .from("sundra_ticket_scans")
      .select("*")
      .eq("departure_id", departureId);

    if (scansError) {
      throw scansError;
    }

    const bookingsWithStats =
      (bookings || []).map((booking: any) => {
        const bookingScans =
          (scans || []).filter(
            (s: any) =>
              s.booking_id === booking.id
          );

        const checkedIn =
          bookingScans.reduce(
            (sum: number, scan: any) =>
              sum +
              Number(
                scan.scanned_count || 0
              ),
            0
          );

        const passengersTotal =
          Number(
            booking.passengers_count ||
              booking
                .sundra_booking_passengers
                ?.length ||
              1
          );

        return {
          ...booking,

          checked_in_count:
            checkedIn,

          remaining_count:
            Math.max(
              0,
              passengersTotal -
                checkedIn
            ),

          fully_checked_in:
            checkedIn >=
            passengersTotal,
        };
      });

    // =========================
    // TOTALER
    // =========================
    const totalPassengers =
      bookingsWithStats.reduce(
        (sum: number, booking: any) =>
          sum +
          Number(
            booking.passengers_count ||
              0
          ),
        0
      );

    const totalCheckedIn =
      bookingsWithStats.reduce(
        (sum: number, booking: any) =>
          sum +
          Number(
            booking.checked_in_count ||
              0
          ),
        0
      );

    return res.status(200).json({
      ok: true,

      departure,

      bookings:
        bookingsWithStats,

      stats: {
        total_bookings:
          bookingsWithStats.length,

        total_passengers:
          totalPassengers,

        checked_in:
          totalCheckedIn,

        remaining:
          Math.max(
            0,
            totalPassengers -
              totalCheckedIn
          ),
      },
    });
  } catch (e: any) {
    console.error(
      "/api/admin/sundra/boarding/[departureId] error:",
      e
    );

    return res.status(500).json({
      ok: false,
      error:
        e?.message ||
        "Kunde inte hämta boarding.",
    });
  }
}
