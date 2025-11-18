// src/pages/api/bookings/one.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";




// HjÃ¤lper oss lÃ¤sa vÃ¤rden oavsett vad kolumnen rÃ¥kar heta
function pick<T = any>(row: any, keys: string[], fallback: T = null as any): T {
  for (const k of keys) {
    if (row && row[k] !== undefined && row[k] !== null) return row[k] as T;
  }
  return fallback;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const id = (req.query.id as string | undefined)?.trim();
    const no = (req.query.no as string | undefined)?.trim();
    if (!id && !no) return res.status(400).json({ error: "Ange id eller no" });

    // VÃ¤lj * fÃ¶r att slippa â€œkolumn saknasâ€-fel mellan olika scheman
    const sel = supabaseAdmin.from("bookings").select("*").limit(1);

    const q = id ? sel.eq("id", id) : sel.eq("booking_number", no as string);
    const { data, error } = await q.single();
    if (error) throw error;
    const b = data || {};

    // Normalisering av fÃ¤lt
    const norm = {
      id: pick<string>(b, ["id"], ""),
      booking_number: pick<string | null>(b, ["booking_number", "booking_no", "bookingId"], null),

      contact_person: pick<string | null>(b, ["contact_person", "contact", "customer_reference"], null),
      customer_phone: pick<string | null>(b, ["customer_phone", "phone", "contact_phone"], null),
      passengers: pick<number | null>(b, ["passengers", "pax"], null),
      notes: pick<string | null>(b, ["notes", "other_info"], null),

      departure_place: pick<string | null>(b, ["departure_place", "from", "departure_location"], null),
      destination: pick<string | null>(b, ["destination", "to", "destination_location"], null),
      departure_date: pick<string | null>(b, ["departure_date", "date"], null),
      departure_time: pick<string | null>(b, ["departure_time", "time"], null),

      return_departure: pick<string | null>(b, ["return_departure", "ret_from", "return_from"], null),
      return_destination: pick<string | null>(b, ["return_destination", "ret_to", "return_to"], null),
      return_date: pick<string | null>(b, ["return_date", "ret_date"], null),
      return_time: pick<string | null>(b, ["return_time", "ret_time"], null),
    };

    return res.status(200).json({ ok: true, booking: norm });
  } catch (e: any) {
    console.error("/api/bookings/one error:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Kunde inte lÃ¤sa bokningen" });
  }
}

