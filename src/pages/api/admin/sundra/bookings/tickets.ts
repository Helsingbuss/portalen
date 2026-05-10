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
        error: "Method not allowed",
      });
    }

    const { data, error } = await supabase
      .from("sundra_bookings")
      .select(`
        *,
        sundra_trips (
          id,
          title,
          destination
        ),
        sundra_departures (
          id,
          departure_date,
          departure_time,
          return_date,
          return_time
        ),
        sundra_booking_passengers (
          id,
          first_name,
          last_name,
          passenger_type,
          seat_number
        )
      `)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    return res.status(200).json({
      ok: true,
      bookings: data || [],
    });
  } catch (e: any) {
    console.error(
      "/api/admin/sundra/bookings/tickets error:",
      e
    );

    return res.status(500).json({
      ok: false,
      error:
        e?.message ||
        "Kunde inte hämta biljetter.",
    });
  }
}
