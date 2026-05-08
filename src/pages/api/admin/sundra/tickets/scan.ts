import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

type ScanBody = {
  qr?: string;
  scanned_count?: number;
  scanned_by?: string;
  scanner_note?: string;
};

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

    const body = req.body as ScanBody;

    if (!body?.qr) {
      return res.status(400).json({
        ok: false,
        error: "QR-data saknas.",
      });
    }

    let parsed: any;

    try {
      parsed =
        typeof body.qr === "string"
          ? JSON.parse(body.qr)
          : body.qr;
    } catch {
      return res.status(400).json({
        ok: false,
        error: "Ogiltig QR-data.",
      });
    }

    const bookingId = parsed?.booking_id;
    const departureId = parsed?.departure_id;
    const ticketHash = parsed?.ticket_hash;

    if (!bookingId || !ticketHash) {
      return res.status(400).json({
        ok: false,
        error: "QR saknar booking_id eller ticket_hash.",
      });
    }

    // HÄMTA BOOKING
    const { data: booking, error: bookingErr } = await supabase
      .from("sundra_bookings")
      .select(`
        *,
        sundra_trips (
          title,
          destination
        ),
        sundra_departures (
          departure_date,
          departure_time
        )
      `)
      .eq("id", bookingId)
      .single();

    if (bookingErr || !booking) {
      return res.status(404).json({
        ok: false,
        error: "Bokningen hittades inte.",
      });
    }

    // HASH-KONTROLL
    if (booking.ticket_hash !== ticketHash) {
      return res.status(403).json({
        ok: false,
        error: "QR-koden är ogiltig.",
      });
    }

    // KONTROLLERA BETALNING
    if (booking.payment_status !== "paid") {
      return res.status(403).json({
        ok: false,
        error: "Biljetten är inte betald.",
      });
    }

    const passengerTotal =
      booking.passengers_count || 1;

    // REDAN SCANNAT
    const { data: scans } = await supabase
      .from("sundra_ticket_scans")
      .select("*")
      .eq("booking_id", booking.id);

    const alreadyScanned =
      scans?.reduce(
        (sum: number, s: any) =>
          sum + (s.scanned_count || 0),
        0
      ) || 0;

    const requestedCount =
      Number(body.scanned_count || 1);

    const remaining =
      passengerTotal - alreadyScanned;

    // ALLA REDAN INCHECKADE
    if (remaining <= 0) {
      return res.status(200).json({
        ok: true,
        status: "already_checked_in",

        booking: {
          booking_number: booking.booking_number,
          customer_name: booking.customer_name,
          trip_title:
            booking.sundra_trips?.title,
          destination:
            booking.sundra_trips?.destination,
        },

        passengers_total: passengerTotal,
        already_checked_in: alreadyScanned,
        remaining: 0,

        message:
          "Alla resenärer är redan incheckade.",
      });
    }

    // FÖRSÖKER SCANNA FÖR MÅNGA
    if (requestedCount > remaining) {
      return res.status(400).json({
        ok: false,
        error: `Endast ${remaining} resenärer kvar att checka in.`,
      });
    }

    // SPARA SCAN
    const { error: insertErr } = await supabase
      .from("sundra_ticket_scans")
      .insert({
        booking_id: booking.id,
        departure_id:
          departureId || booking.departure_id,

        booking_number:
          booking.booking_number,

        ticket_hash: booking.ticket_hash,

        scanned_count: requestedCount,

        scanned_by:
          body.scanned_by || null,

        scanner_note:
          body.scanner_note || null,

        scan_status: "checked_in",
        scan_source: "portal",
      });

    if (insertErr) {
      throw insertErr;
    }

    const newCheckedIn =
      alreadyScanned + requestedCount;

    return res.status(200).json({
      ok: true,
      status:
        newCheckedIn >= passengerTotal
          ? "fully_checked_in"
          : "partially_checked_in",

      booking: {
        id: booking.id,
        booking_number:
          booking.booking_number,

        customer_name:
          booking.customer_name,

        trip_title:
          booking.sundra_trips?.title,

        destination:
          booking.sundra_trips?.destination,

        departure_date:
          booking.sundra_departures
            ?.departure_date,

        departure_time:
          booking.sundra_departures
            ?.departure_time,
      },

      passengers_total: passengerTotal,

      checked_in_now: requestedCount,

      already_checked_in:
        newCheckedIn,

      remaining:
        passengerTotal - newCheckedIn,

      message:
        newCheckedIn >= passengerTotal
          ? "Alla resenärer är nu incheckade."
          : `${requestedCount} resenärer incheckade.`,
    });
  } catch (e: any) {
    console.error(
      "/api/admin/sundra/tickets/scan error:",
      e
    );

    return res.status(500).json({
      ok: false,
      error:
        e?.message ||
        "Kunde inte scanna biljett.",
    });
  }
}
