import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { data, error } = await supabaseAdmin
      .from("sundra_bookings")
      .select(`
        id,
        booking_number,
        customer_name,
        total_amount,
        payment_status,
        created_at,
        sundra_trips (
          title
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const bookings = data || [];

    const paid = bookings.filter((b: any) => b.payment_status === "paid");
    const pending = bookings.filter((b: any) => b.payment_status !== "paid");

    return res.status(200).json({
      totalRevenue: paid.reduce(
        (sum: number, b: any) => sum + Number(b.total_amount || 0),
        0
      ),
      paidCount: paid.length,
      unpaidCount: pending.length,
      bookingsCount: bookings.length,
      recent: bookings.slice(0, 6),
      pending: pending.slice(0, 6),
    });
  } catch (e: any) {
    console.error("/api/admin/store/dashboard error:", e?.message || e);

    return res.status(500).json({
      totalRevenue: 0,
      paidCount: 0,
      unpaidCount: 0,
      bookingsCount: 0,
      recent: [],
      pending: [],
      error: e?.message || "Kunde inte hämta butik/kassa.",
    });
  }
}
