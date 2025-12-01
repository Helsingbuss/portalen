// src/pages/api/pricing/get.ts
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
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });
  }

  const trip_id = String(req.query.trip_id || "").trim();
  const departure_date = String(req.query.departure_date || "").trim();

  if (!trip_id) {
    return res
      .status(400)
      .json({ ok: false, error: "trip_id krävs." });
  }
  if (!departure_date || !/^\d{4}-\d{2}-\d{2}$/.test(departure_date)) {
    return res.status(400).json({
      ok: false,
      error: 'departure_date måste vara YYYY-MM-DD.',
    });
  }

  try {
    const { data: trip, error: tripErr } = await supabase
      .from("trips")
      .select("id, title, year")
      .eq("id", trip_id)
      .single();

    if (tripErr) throw tripErr;

    const { data: ticketTypes, error: ttErr } = await supabase
      .from("ticket_types")
      .select(
        "id, code, name, description, kind, sort_order, is_active, created_at"
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (ttErr) throw ttErr;

    const { data: prices, error: priceErr } = await supabase
      .from("departure_ticket_prices")
      .select("id, ticket_type_id, price, currency")
      .eq("trip_id", trip_id)
      .eq("departure_date", departure_date);

    if (priceErr) throw priceErr;

    return res.status(200).json({
      ok: true,
      trip,
      departure_date,
      ticket_types: ticketTypes || [],
      prices: prices || [],
    });
  } catch (e: any) {
    console.error("/api/pricing/get error:", e);
    return res
      .status(500)
      .json({ ok: false, error: e?.message || "Server error" });
  }
}
