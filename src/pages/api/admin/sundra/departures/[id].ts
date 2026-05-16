import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

function normalizeLineIds(body: any): string[] {
  const raw = body.line_ids || body.lines || body.line_id || [];

  if (Array.isArray(raw)) {
    return raw.filter(Boolean).map(String);
  }

  if (typeof raw === "string" && raw.trim()) {
    return [raw.trim()];
  }

  return [];
}

async function replaceDepartureLines(departureId: string, lineIds: string[]) {
  const { error: deleteError } = await supabase
    .from("sundra_departure_lines")
    .delete()
    .eq("departure_id", departureId);

  if (deleteError) throw deleteError;

  if (!lineIds.length) return;

  const rows = lineIds.map((lineId) => ({
    departure_id: departureId,
    line_id: lineId,
  }));

  const { error: insertError } = await supabase
    .from("sundra_departure_lines")
    .insert(rows);

  if (insertError) throw insertError;
}

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
          sundra_departure_lines (
            id,
            line_id,
            sundra_lines (
              id,
              name,
              code,
              color,
              start_city,
              end_city,
              status
            )
          ),
          sundra_bus_maps (
            id,
            name,
            seats_count,
            bus_type
          ),
          sundra_vehicles (
            id,
            name,
            registration_number,
            operator_name,
            seats_count,
            bus_map_id,
            sundra_bus_maps (
              id,
              name,
              seats_count
            )
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

      let busMapId = body.bus_map_id || null;

      if (body.vehicle_id && !busMapId) {
        const { data: vehicle } = await supabase
          .from("sundra_vehicles")
          .select("bus_map_id, seats_count")
          .eq("id", body.vehicle_id)
          .maybeSingle();

        if (vehicle?.bus_map_id) {
          busMapId = vehicle.bus_map_id;
        }
      }

      const lineIds = normalizeLineIds(body);

      const updateData = {
        trip_id: body.trip_id || null,

        // Bakåtkompatibel kolumn om den finns i sundra_departures.
        line_id: lineIds[0] || body.line_id || null,

        vehicle_id: body.vehicle_id || null,
        bus_map_id: busMapId,

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
          sundra_departure_lines (
            id,
            line_id,
            sundra_lines (
              id,
              name,
              code,
              color,
              start_city,
              end_city,
              status
            )
          ),
          sundra_bus_maps (
            id,
            name,
            seats_count,
            bus_type
          ),
          sundra_vehicles (
            id,
            name,
            registration_number,
            operator_name,
            seats_count,
            bus_map_id,
            sundra_bus_maps (
              id,
              name,
              seats_count
            )
          )
        `)
        .single();

      if (error) throw error;

      await replaceDepartureLines(id, lineIds);

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
