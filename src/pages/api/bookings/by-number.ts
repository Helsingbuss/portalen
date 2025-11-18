// src/pages/api/bookings/by-number.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/supabaseAdmin";




/**
 * GET /api/bookings/by-number?no=BK25XXXX
 * Returnerar { booking } eller 404
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const no =
      String(req.query.no ?? req.query.number ?? req.query.booking_number ?? "").trim();

    if (!no) {
      return res.status(400).json({ error: "Saknar bokningsnummer (?no=BK25XXXX)" });
    }

    const db = requireAdmin();

    // Justera kolumnnamn om din tabell heter annorlunda (t.ex. booking_number)
    const { data, error } = await db
      .from("bookings")
      .select("*")
      .eq("booking_number", no)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Bokningen hittades inte" });

    return res.status(200).json({ booking: data });
  } catch (e: any) {
    console.error("bookings/by-number error:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Serverfel" });
  }
}

