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
    // =========================
    // GET
    // =========================
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("shuttle_departures")
        .select(`
          *,
          shuttle_routes (
            id,
            name,
            route_code,
            from_city,
            to_airport
          )
        `)
        .order("departure_date", {
          ascending: true,
        });

      if (error) {
        throw error;
      }

      return res.status(200).json({
        ok: true,
        departures: data || [],
      });
    }

    // =========================
    // POST
    // =========================
    if (req.method === "POST") {
      const body = req.body || {};

      if (!body.route_id) {
        return res.status(400).json({
          ok: false,
          error: "route_id saknas.",
        });
      }

      const insertData = {
        route_id: body.route_id,

        vehicle_id: body.vehicle_id || null,
        bus_map_id: body.bus_map_id || null,

        departure_date: body.departure_date || null,
        departure_time: body.departure_time || null,

        return_date: body.return_date || null,
        return_time: body.return_time || null,

        departure_location:
          body.departure_location || null,

        destination_location:
          body.destination_location || null,

        price:
          body.price === "" ||
          body.price === null ||
          body.price === undefined
            ? 0
            : Number(body.price),

        capacity:
          Number(body.capacity || 0),

        booked_count:
          Number(body.booked_count || 0),

        status:
          body.status || "open",

        booking_deadline:
          body.booking_deadline || null,

        notes:
          body.notes || null,

        created_at:
          new Date().toISOString(),

        updated_at:
          new Date().toISOString(),
      };

      const { data, error } =
        await supabase
          .from("shuttle_departures")
          .insert(insertData)
          .select(`
            *,
            shuttle_routes (
              id,
              name,
              route_code,
              from_city,
              to_airport
            )
          `)
          .single();

      if (error) {
        throw error;
      }

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
    console.error(
      "/api/admin/shuttle/departures error:",
      e
    );

    return res.status(500).json({
      ok: false,
      error:
        e?.message ||
        "Kunde inte hantera avgångar.",
    });
  }
}
