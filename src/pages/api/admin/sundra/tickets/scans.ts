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

    const limit = Math.min(Number(req.query.limit || 50), 200);

    const { data, error } = await supabase
      .from("sundra_ticket_scans")
      .select(`
        id,
        booking_id,
        departure_id,
        booking_number,
        scanned_count,
        scanned_by,
        scanner_note,
        scan_status,
        scan_source,
        created_at,
        sundra_bookings (
          id,
          booking_number,
          customer_name,
          customer_email,
          passengers_count,
          payment_status,
          sundra_trips (
            title,
            destination
          ),
          sundra_departures (
            departure_date,
            departure_time,
            return_date,
            return_time
          )
        )
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    const scans = (data || []).map((scan: any) => ({
      id: scan.id,
      booking_id: scan.booking_id,
      departure_id: scan.departure_id,
      booking_number:
        scan.booking_number ||
        scan.sundra_bookings?.booking_number ||
        "—",

      scanned_count: scan.scanned_count || 0,
      scanned_by: scan.scanned_by || "—",
      scanner_note: scan.scanner_note || null,
      scan_status: scan.scan_status,
      scan_source: scan.scan_source,
      created_at: scan.created_at,

      customer_name: scan.sundra_bookings?.customer_name || "—",
      customer_email: scan.sundra_bookings?.customer_email || null,
      passengers_count: scan.sundra_bookings?.passengers_count || 0,
      payment_status: scan.sundra_bookings?.payment_status || "—",

      trip_title: scan.sundra_bookings?.sundra_trips?.title || "Sundra resa",
      destination: scan.sundra_bookings?.sundra_trips?.destination || "—",

      departure_date:
        scan.sundra_bookings?.sundra_departures?.departure_date || null,
      departure_time:
        scan.sundra_bookings?.sundra_departures?.departure_time || null,
      return_date:
        scan.sundra_bookings?.sundra_departures?.return_date || null,
      return_time:
        scan.sundra_bookings?.sundra_departures?.return_time || null,
    }));

    return res.status(200).json({
      ok: true,
      scans,
    });
  } catch (e: any) {
    console.error("/api/admin/sundra/tickets/scans error:", e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte hämta scan-historik.",
    });
  }
}
