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
        error: "Method not allowed",
      });
    }

    const booking_id =
      req.body?.booking_id;

    const reason =
      req.body?.reason || null;

    if (!booking_id) {
      return res.status(400).json({
        ok: false,
        error: "booking_id saknas.",
      });
    }

    // Uppdatera bokning
    const {
      data: booking,
      error,
    } = await supabase
      .from("sundra_bookings")
      .update({
        status: "cancelled",
        cancelled_at:
          new Date().toISOString(),
        cancellation_reason:
          reason,
      })
      .eq("id", booking_id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Frigör passagerarsäten
    await supabase
      .from(
        "sundra_booking_passengers"
      )
      .update({
        seat_number: null,
      })
      .eq(
        "booking_id",
        booking_id
      );

    return res.status(200).json({
      ok: true,
      booking,
    });
  } catch (e: any) {
    console.error(
      "/api/admin/sundra/bookings/cancel error:",
      e
    );

    return res.status(500).json({
      ok: false,
      error:
        e?.message ||
        "Kunde inte avboka bokning.",
    });
  }
}
