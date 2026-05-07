import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      const { data, error } = await supabaseAdmin
        .from("sundra_departures")
        .select(`
          *,
          sundra_trips (
            id,
            title,
            slug,
            category,
            destination
          )
        `)
        .order("departure_date", { ascending: true });

      if (error) throw error;

      const departures = (data || []).map((row: any) => ({
        ...row,
        title: row.sundra_trips?.title || "—",
        slug: row.sundra_trips?.slug || null,
        category: row.sundra_trips?.category || null,
        destination: row.sundra_trips?.destination || null,
        seats_total: row.capacity ?? 0,
        seats_booked: row.booked_count ?? 0,
        booking_open: row.status === "open",
      }));

      return res.status(200).json({
        ok: true,
        departures,
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};

      if (!body.trip_id) {
        return res.status(400).json({
          ok: false,
          error: "Resa saknas.",
        });
      }

      if (!body.departure_date) {
        return res.status(400).json({
          ok: false,
          error: "Avgångsdatum saknas.",
        });
      }

      const insertData = {
        trip_id: body.trip_id,
        departure_date: body.departure_date,
        departure_time: body.departure_time || null,
        return_date: body.return_date || null,
        return_time: body.return_time || null,
        price: body.price === "" || body.price == null ? 0 : Number(body.price),
        capacity:
          body.capacity === "" || body.capacity == null
            ? 0
            : Number(body.capacity),
        booked_count:
          body.booked_count === "" || body.booked_count == null
            ? 0
            : Number(body.booked_count),
        status: body.status || "open",
        last_booking_date: body.last_booking_date || null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabaseAdmin
        .from("sundra_departures")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        departure: data,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (e: any) {
    console.error("/api/admin/sundra/departures error:", e?.message || e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte hantera avgångar.",
    });
  }
}
