// src/pages/api/admin/pricing/save.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";

type SaveResponse = {
  ok: boolean;
  error?: string;
  row?: any;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SaveResponse>
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed (use POST)." });
  }

  const { trip_id, ticket_type_id, departure_date, price } = req.body || {};

  if (!trip_id || !ticket_type_id) {
    return res.status(400).json({
      ok: false,
      error: "trip_id och ticket_type_id krävs.",
    });
  }

  const numericPrice = Number(price);
  if (!numericPrice || Number.isNaN(numericPrice)) {
    return res.status(400).json({
      ok: false,
      error: "Ogiltigt pris.",
    });
  }

  const dep =
    departure_date && String(departure_date).length >= 10
      ? String(departure_date).slice(0, 10)
      : null;

  try {
    // Finns redan en rad för (trip, ticket_type, departure_date)?
    let query = supabase
      .from("trip_ticket_pricing")
      .select("id, trip_id, ticket_type_id, departure_date, price, currency")
      .eq("trip_id", trip_id)
      .eq("ticket_type_id", ticket_type_id)
      .limit(1);

    if (dep === null) {
      query = query.is("departure_date", null);
    } else {
      query = query.eq("departure_date", dep);
    }

    const { data: existingRows, error: existingError } = await query;
    if (existingError) throw existingError;

    let savedRow: any;

    if (existingRows && existingRows.length > 0) {
      const existing = existingRows[0];
      const { data, error } = await supabase
        .from("trip_ticket_pricing")
        .update({
          price: numericPrice,
          departure_date: dep,
        })
        .eq("id", existing.id)
        .select("*")
        .single();

      if (error) throw error;
      savedRow = data;
    } else {
      const { data, error } = await supabase
        .from("trip_ticket_pricing")
        .insert({
          trip_id,
          ticket_type_id,
          departure_date: dep,
          price: numericPrice,
          currency: "SEK",
        })
        .select("*")
        .single();

      if (error) throw error;
      savedRow = data;
    }

    return res.status(200).json({ ok: true, row: savedRow });
  } catch (e: any) {
    console.error("pricing/save error", e);
    return res.status(500).json({
      ok: false,
      error: e?.message || "Tekniskt fel vid sparande av pris.",
    });
  }
}
