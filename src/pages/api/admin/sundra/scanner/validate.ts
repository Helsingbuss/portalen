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
    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error:
          "Method not allowed",
      });
    }

    const { qr } =
      req.body || {};

    if (!qr) {
      return res.status(400).json({
        ok: false,
        error:
          "QR-data saknas.",
      });
    }

    let parsed: any;

    try {
      parsed =
        typeof qr === "string"
          ? JSON.parse(qr)
          : qr;
    } catch {
      return res.status(400).json({
        ok: false,
        error:
          "Ogiltig QR-data.",
      });
    }

    const bookingId =
      parsed?.booking_id;

    const ticketHash =
      parsed?.ticket_hash;

    if (
      !bookingId ||
      !ticketHash
    ) {
      return res.status(400).json({
        ok: false,
        error:
          "QR-data saknar booking_id eller ticket_hash.",
      });
    }

    // =========================
    // BOOKING
    // =========================
    const {
      data: booking,
      error,
    } = await supabase
      .from(
        "sundra_bookings"
      )
      .select(`
        *,
        sundra_trips (
          title,
          destination
        ),
        sundra_departures (
          departure_date,
          departure_time,
          departure_location
        )
      `)
      .eq("id", bookingId)
      .single();

    if (error || !booking) {
      return res.status(404).json({
        ok: false,
        error:
          "Biljetten hittades inte.",
      });
    }

    // =========================
    // HASH
    // =========================
    if (
      booking.ticket_hash !==
      ticketHash
    ) {
      return res.status(403).json({
        ok: false,
        error:
          "QR-koden är ogiltig.",
      });
    }

    // =========================
    // BETALNING
    // =========================
    if (
      booking.payment_status !==
      "paid"
    ) {
      return res.status(403).json({
        ok: false,
        error:
          "Biljetten är inte betald.",
      });
    }

    // =========================
    // SCANS
    // =========================
    const {
      data: scans,
    } = await supabase
      .from(
        "sundra_ticket_scans"
      )
      .select("*")
      .eq(
        "booking_id",
        booking.id
      );

    const scanned =
      scans?.reduce(
        (
          sum: number,
          scan: any
        ) =>
          sum +
          Number(
            scan.scanned_count ||
              0
          ),
        0
      ) || 0;

    const totalPassengers =
      Number(
        booking.passengers_count ||
          1
      );

    const remaining =
      Math.max(
        0,
        totalPassengers -
          scanned
      );

    return res.status(200).json({
      ok: true,

      valid: true,

      booking: {
        id: booking.id,

        booking_number:
          booking.booking_number,

        customer_name:
          booking.customer_name,

        customer_email:
          booking.customer_email,

        passengers_count:
          totalPassengers,

        checked_in:
          scanned,

        remaining,

        payment_status:
          booking.payment_status,

        trip_title:
          booking
            .sundra_trips
            ?.title,

        destination:
          booking
            .sundra_trips
            ?.destination,

        departure_date:
          booking
            .sundra_departures
            ?.departure_date,

        departure_time:
          booking
            .sundra_departures
            ?.departure_time,

        departure_location:
          booking
            .sundra_departures
            ?.departure_location,
      },
    });
  } catch (e: any) {
    console.error(
      "/api/admin/sundra/scanner/validate error:",
      e
    );

    return res.status(500).json({
      ok: false,
      error:
        e?.message ||
        "Kunde inte verifiera biljett.",
    });
  }
}
