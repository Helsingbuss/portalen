import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

function money(value: any) {
  if (value === "" || value === null || value === undefined) return 0;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function numberValue(value: any) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function cleanTime(value: any) {
  if (!value) return null;
  return String(value).slice(0, 5);
}

async function loadDeparture(id: string) {
  const { data: departure, error } = await supabase
    .from("shuttle_departures")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  const { data: stops, error: stopsError } = await supabase
    .from("shuttle_departure_stops")
    .select("*")
    .eq("departure_id", id)
    .order("stop_order", { ascending: true });

  if (stopsError) throw stopsError;

  let line = null;
  let route = null;

  if (departure?.line_id) {
    const { data } = await supabase
      .from("shuttle_lines")
      .select("*")
      .eq("id", departure.line_id)
      .maybeSingle();

    line = data || null;
  }

  if (departure?.route_id) {
    const { data } = await supabase
      .from("shuttle_routes")
      .select("*")
      .eq("id", departure.route_id)
      .maybeSingle();

    route = data || null;
  }

  return {
    ...departure,
    shuttle_lines: line,
    shuttle_routes: route,
    shuttle_departure_stops: stops || [],
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const id = String(req.query.id || "");

    if (!id) {
      return res.status(400).json({
        ok: false,
        error: "Avgångs-ID saknas.",
      });
    }

    if (req.method === "GET") {
      const departure = await loadDeparture(id);

      return res.status(200).json({
        ok: true,
        departure,
      });
    }

    if (req.method === "PUT") {
      const body = req.body || {};

      const updateData: any = {
        departure_date: body.departure_date || null,
        departure_time: cleanTime(body.departure_time),

        departure_location: body.departure_location || null,
        destination_location: body.destination_location || null,

        price: money(body.price),
        capacity: numberValue(body.capacity),
        booked_count: numberValue(body.booked_count),

        status: body.status || "open",
        booking_deadline: body.booking_deadline || null,
        notes: body.notes || null,

        updated_at: new Date().toISOString(),
      };

      if (body.route_id !== undefined) updateData.route_id = body.route_id || null;
      if (body.line_id !== undefined) updateData.line_id = body.line_id || null;

      const { error: updateError } = await supabase
        .from("shuttle_departures")
        .update(updateData)
        .eq("id", id);

      if (updateError) throw updateError;

      if (Array.isArray(body.stops)) {
        const { error: deleteStopsError } = await supabase
          .from("shuttle_departure_stops")
          .delete()
          .eq("departure_id", id);

        if (deleteStopsError) throw deleteStopsError;

        const rows = body.stops.map((stop: any, index: number) => ({
          departure_id: id,
          line_id: body.line_id || stop.line_id || null,
          line_stop_id: stop.line_stop_id || null,
          stop_id: stop.stop_id || null,
          stop_name: stop.stop_name || stop.name || null,
          city: stop.city || null,
          stop_order: Number(stop.stop_order || index + 1),
          scheduled_time: cleanTime(stop.scheduled_time),
          price: money(stop.price),
          direction: body.direction || stop.direction || "outbound",
          is_return: Boolean(body.is_return || stop.is_return),
          created_at: new Date().toISOString(),
        }));

        if (rows.length > 0) {
          const { error: insertStopsError } = await supabase
            .from("shuttle_departure_stops")
            .insert(rows);

          if (insertStopsError) throw insertStopsError;
        }
      }

      const departure = await loadDeparture(id);

      return res.status(200).json({
        ok: true,
        departure,
      });
    }

    if (req.method === "DELETE") {
      const { error: stopsError } = await supabase
        .from("shuttle_departure_stops")
        .delete()
        .eq("departure_id", id);

      if (stopsError) throw stopsError;

      const { error } = await supabase
        .from("shuttle_departures")
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
    console.error("/api/admin/shuttle/departures/[id] error:", e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte hantera avgången.",
    });
  }
}
