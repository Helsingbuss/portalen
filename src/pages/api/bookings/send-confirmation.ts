import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";
import { sendBookingMail } from "@/lib/sendBookingMail";

const supabase =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

type JsonError = { error: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<any | JsonError>) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    if (!supabase) return res.status(500).json({ error: "Supabase-admin saknas" });

    const { bookingId } = req.body || {};
    if (!bookingId) return res.status(400).json({ error: "Saknar bookingId" });

    const { data: b, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (error) throw error;
    if (!b) return res.status(404).json({ error: "Bokning hittades inte" });

    if (!b.customer_email) return res.status(400).json({ error: "Bokningen saknar customer_email" });

    await sendBookingMail({
      to: b.customer_email,
      bookingNumber: b.booking_number ?? b.id,
      passengers: b.passengers ?? null,
      out: {
        date: b.departure_date ?? null,
        time: b.departure_time ?? null,
        from: b.departure_place ?? null,
        to: b.destination ?? null,
      },
      ret: b.return_date
        ? {
            date: b.return_date ?? null,
            time: b.return_time ?? null,
            from: b.return_departure ?? null,
            to: b.return_destination ?? null,
          }
        : null,
    });

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error("/api/bookings/send-confirmation error:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Kunde inte skicka bokningen igen." });
  }
}
