import type { NextApiRequest, NextApiResponse } from "next";
import { randomUUID } from "crypto";
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

function routeSelect() {
  return `
    *,
    shuttle_routes (
      id,
      name,
      route_code,
      from_city,
      to_city
    ),
    shuttle_lines (
      id,
      name,
      code,
      start_city,
      end_city
    )
  `;
}

function normalizeStops(stops: any[], departureId: string, body: any, direction: "outbound" | "return") {
  return (Array.isArray(stops) ? stops : []).map((stop, index) => ({
    departure_id: departureId,
    line_id: body.line_id || null,
    line_stop_id: stop.line_stop_id || stop.id || null,
    stop_id: stop.stop_id || null,
    stop_name: stop.stop_name || stop.name || null,
    city: stop.city || null,
    stop_order: Number(stop.stop_order || index + 1),
    scheduled_time: stop.scheduled_time || stop.departure_time || null,
    price: money(stop.price),
    direction,
    is_return: direction === "return",
    created_at: new Date().toISOString(),
  }));
}

async function insertDepartureStops(departureId: string, body: any, direction: "outbound" | "return") {
  const sourceStops = direction === "return" ? body.return_stops : body.stops;
  const rows = normalizeStops(sourceStops || [], departureId, body, direction);

  if (!rows.length) return;

  const { error } = await supabase
    .from("shuttle_departure_stops")
    .insert(rows);

  if (error) throw error;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("shuttle_departures")
        .select(routeSelect())
        .order("departure_date", { ascending: true })
        .order("departure_time", { ascending: true });

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        departures: data || [],
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};

      if (!body.route_id) {
        return res.status(400).json({
          ok: false,
          error: "route_id saknas. Välj en linje som är kopplad till en rutt.",
        });
      }

      if (!body.line_id) {
        return res.status(400).json({
          ok: false,
          error: "line_id saknas. Välj linje.",
        });
      }

      if (!body.departure_date) {
        return res.status(400).json({
          ok: false,
          error: "Datum för utresa saknas.",
        });
      }

      if (!body.departure_time) {
        return res.status(400).json({
          ok: false,
          error: "Tid för utresa saknas.",
        });
      }

      const hasReturn =
        body.has_return === true ||
        body.has_return === "true" ||
        body.has_return === "1";

      if (hasReturn && !body.return_date) {
        return res.status(400).json({
          ok: false,
          error: "Returdatum saknas.",
        });
      }

      if (hasReturn && !body.return_time) {
        return res.status(400).json({
          ok: false,
          error: "Returtid saknas.",
        });
      }

      const tripGroupId = randomUUID();

      const outboundInsert = {
        route_id: body.route_id,
        line_id: body.line_id,

        vehicle_id: body.vehicle_id || null,
        bus_map_id: body.bus_map_id || null,

        departure_date: body.departure_date || null,
        departure_time: body.departure_time || null,

        return_date: hasReturn ? body.return_date || null : null,
        return_time: hasReturn ? body.return_time || null : null,
        return_price: hasReturn ? money(body.return_price || body.price) : null,

        departure_location: body.departure_location || null,
        destination_location: body.destination_location || null,

        price: money(body.price),
        capacity: numberValue(body.capacity),
        booked_count: numberValue(body.booked_count),

        direction: "outbound",
        is_return: false,
        trip_group_id: tripGroupId,
        parent_departure_id: null,
        return_departure_id: null,

        status: body.status || "open",
        booking_deadline: body.booking_deadline || null,
        notes: body.notes || null,

        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: outbound, error: outboundError } = await supabase
        .from("shuttle_departures")
        .insert(outboundInsert)
        .select(routeSelect())
        .single();

      if (outboundError) throw outboundError;

      await insertDepartureStops(outbound.id, body, "outbound");

      let returnDeparture = null;

      if (hasReturn) {
        const returnInsert = {
          route_id: body.route_id,
          line_id: body.line_id,

          vehicle_id: body.return_vehicle_id || body.vehicle_id || null,
          bus_map_id: body.return_bus_map_id || body.bus_map_id || null,

          departure_date: body.return_date || null,
          departure_time: body.return_time || null,

          return_date: null,
          return_time: null,
          return_price: null,

          departure_location: body.return_departure_location || body.destination_location || null,
          destination_location: body.return_destination_location || body.departure_location || null,

          price: money(body.return_price || body.price),
          capacity: numberValue(body.return_capacity || body.capacity),
          booked_count: 0,

          direction: "return",
          is_return: true,
          trip_group_id: tripGroupId,
          parent_departure_id: outbound.id,
          return_departure_id: null,

          status: body.return_status || body.status || "open",
          booking_deadline: body.return_booking_deadline || body.booking_deadline || null,
          notes: body.return_notes || body.notes || null,

          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data: createdReturn, error: returnError } = await supabase
          .from("shuttle_departures")
          .insert(returnInsert)
          .select(routeSelect())
          .single();

        if (returnError) throw returnError;

        returnDeparture = createdReturn;

        await insertDepartureStops(createdReturn.id, body, "return");

        await supabase
          .from("shuttle_departures")
          .update({
            return_departure_id: createdReturn.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", outbound.id);
      }

      return res.status(201).json({
        ok: true,
        departure: outbound,
        return_departure: returnDeparture,
        departures: returnDeparture ? [outbound, returnDeparture] : [outbound],
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (e: any) {
    console.error("/api/admin/shuttle/departures error:", e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte hantera avgångar.",
    });
  }
}
