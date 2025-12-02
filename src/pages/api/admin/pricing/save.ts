// src/pages/api/admin/pricing/save.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

type SaveBody = {
  trip_id: string;
  ticket_type_id: number;
  departure_date: string | null;
  price: number;
};

type PricingRow = {
  id: number;
  trip_id: string;
  ticket_type_id: number;
  departure_date: string | null;
  price: number;
  currency: string;
};

type Resp =
  | { ok: true; row: PricingRow }
  | { ok: false; error: string };

function setCORS(res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Resp>
) {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });
  }

  try {
    const body = req.body as SaveBody;

    if (!body.trip_id) {
      return res
        .status(400)
        .json({ ok: false, error: "Saknar trip_id." });
    }
    if (!body.ticket_type_id) {
      return res
        .status(400)
        .json({ ok: false, error: "Saknar ticket_type_id." });
    }
    if (!body.price || isNaN(body.price)) {
      return res
        .status(400)
        .json({ ok: false, error: "Ogiltigt pris." });
    }

    const depDate = body.departure_date || null;

    // Försök hitta befintlig rad för (resa + biljett + datum)
    let query = supabase
      .from("trip_ticket_pricing")
      .select("id, trip_id, ticket_type_id, departure_date, price, currency");

    query = query.eq("trip_id", body.trip_id).eq("ticket_type_id", body.ticket_type_id);

    if (depDate) {
      query = query.eq("departure_date", depDate);
    } else {
      query = query.is("departure_date", null);
    }

    const { data: existing, error: existingErr } = await query.limit(1);

    if (existingErr) throw existingErr;

    let saved: PricingRow | null = null;

    if (existing && existing.length > 0) {
      // UPDATE
      const id = existing[0].id;
      const { data, error } = await supabase
        .from("trip_ticket_pricing")
        .update({
          price: body.price,
          currency: "SEK",
          departure_date: depDate,
        })
        .eq("id", id)
        .select("id, trip_id, ticket_type_id, departure_date, price, currency")
        .single();

      if (error) throw error;
      saved = data;
    } else {
      // INSERT
      const { data, error } = await supabase
        .from("trip_ticket_pricing")
        .insert({
          trip_id: body.trip_id,
          ticket_type_id: body.ticket_type_id,
          departure_date: depDate,
          price: body.price,
          currency: "SEK",
        })
        .select("id, trip_id, ticket_type_id, departure_date, price, currency")
        .single();

      if (error) throw error;
      saved = data;
    }

    if (!saved) {
      throw new Error("Kunde inte spara prisraden.");
    }

    return res.status(200).json({ ok: true, row: saved });
  } catch (e: any) {
    console.error("pricing/save error", e);
    return res.status(500).json({
      ok: false,
      error: e?.message || "Tekniskt fel vid sparande.",
    });
  }
}
