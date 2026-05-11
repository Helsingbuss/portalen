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
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        ok: false,
        error: "ID saknas.",
      });
    }

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("sundra_departures")
        .select(`
          *,
          sundra_trips (
            id,
            title,
            destination,
            image_url
          ),
          sundra_lines (
            id,
            name,
            code,
            color
          ),
          sundra_bus_maps (
            id,
            name,
            seats_count,
            bus_type
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        departure: data,
      });
    }

    if (req.method === "PUT" || req.method === "PATCH") {
      const body = req.body || {};

      const updateData = {
        trip_id: body.trip_id || null,
        line_id: body.line_id || null,
        bus_map_id: body.bus_map_id || null,

        departure_date: body.departure_date || null,
        departure_time: body.departure_time || null,

        return_date: body.return_date || null,
        return_time: body.return_time || null,

        departure_location: body.departure_location || null,
        destination_location: body.destination_location || null,

        price:
          body.price === "" || body.price === null || body.price === undefined
            ? null
            : Number(body.price),

        capacity: Number(body.capacity || 0),
        booked_count: Number(body.booked_count || 0),

        status: body.status || "open",

        last_booking_date: body.last_booking_date || null,
        booking_deadline: body.booking_deadline || null,

        notes: body.notes || null,

        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("sundra_departures")
        .update(updateData)
        .eq("id", id)
        .select(`
          *,
          sundra_trips (
            id,
            title,
            destination,
            image_url
          ),
          sundra_lines (
            id,
            name,
            code,
            color
          ),
          sundra_bus_maps (
            id,
            name,
            seats_count,
            bus_type
          )
        `)
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        departure: data,
      });
    }

    if (req.method === "DELETE") {
      const { error } = await supabase
        .from("sundra_departures")
        .delete()
        .eq("id", id);

      if (error) throw error;

      return res.status(200).json({
        ok: true,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (e: any) {
    console.error("/api/admin/sundra/departures/[id] error:", e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte hantera avgång.",
    });
  }
}
