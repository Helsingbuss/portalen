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
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("sundra_refunds")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        refunds: data || [],
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};

      if (!body.booking_id) {
        return res.status(400).json({
          ok: false,
          error: "booking_id saknas.",
        });
      }

      const { data: booking, error: bookingErr } = await supabase
        .from("sundra_bookings")
        .select("*")
        .eq("id", body.booking_id)
        .single();

      if (bookingErr || !booking) {
        throw bookingErr || new Error("Bokningen hittades inte.");
      }

      const { data, error } = await supabase
        .from("sundra_refunds")
        .insert({
          booking_id: booking.id,
          booking_number: booking.booking_number,
          customer_name: booking.customer_name,
          customer_email: booking.customer_email,
          amount: Number(body.amount ?? booking.total_amount ?? 0),
          currency: body.currency || booking.currency || "SEK",
          status: body.status || "pending",
          reason: body.reason || null,
          method: body.method || "Manuell",
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        refund: data,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (e: any) {
    console.error("/api/admin/sundra/refunds error:", e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte hantera återbetalningar.",
    });
  }
}
