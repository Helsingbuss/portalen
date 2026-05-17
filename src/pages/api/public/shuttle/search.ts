import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function toNumber(value: any, fallback = 1) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function time(value?: string | null) {
  if (!value) return null;
  return String(value).slice(0, 5);
}

function seatsLeft(departure: any) {
  return Math.max(
    0,
    Number(departure.capacity || 0) - Number(departure.booked_count || 0)
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
      });
    }

    const fromStopId = String(req.query.from_stop_id || "").trim();
    const routeId = String(req.query.route_id || "").trim();
    const lineId = String(req.query.line_id || "").trim();
    const date = String(req.query.date || "").trim();
    const passengers = toNumber(req.query.passengers, 1);

    let stopsQuery = supabaseAdmin
      .from("shuttle_line_stops")
      .select(`
        id,
        line_id,
        stop_id,
        stop_order,
        departure_time,
        arrival_time,
        price,
        is_active,
        shuttle_stops (
          id,
          name,
          city,
          address,
          stop_code
        ),
        shuttle_lines (
          id,
          name,
          code,
          route_id,
          status,
          shuttle_routes (
            id,
            name,
            route_code,
            airport_name,
            start_city,
            end_city,
            default_price,
            status
          )
        )
      `)
      .eq("is_active", true);

    if (fromStopId) {
      stopsQuery = stopsQuery.eq("stop_id", fromStopId);
    }

    if (lineId) {
      stopsQuery = stopsQuery.eq("line_id", lineId);
    }

    const { data: lineStops, error: lineStopsError } = await stopsQuery;

    if (lineStopsError) throw lineStopsError;

    const usableLineStops = (lineStops || []).filter((item: any) => {
      const line = Array.isArray(item.shuttle_lines)
        ? item.shuttle_lines[0]
        : item.shuttle_lines;

      const route = Array.isArray(line?.shuttle_routes)
        ? line.shuttle_routes[0]
        : line?.shuttle_routes;

      if (!line || line.status === "inactive") return false;
      if (!route || route.status === "inactive") return false;
      if (routeId && route.id !== routeId) return false;

      return true;
    });

    const lineIds = Array.from(
      new Set(
        usableLineStops
          .map((item: any) => item.line_id)
          .filter(Boolean)
      )
    );

    let departuresQuery = supabaseAdmin
      .from("shuttle_departures")
      .select(`
        *,
        shuttle_routes (
          id,
          name,
          route_code,
          airport_name,
          start_city,
          end_city,
          default_price
        )
      `)
      .eq("status", "open")
      .order("departure_date", { ascending: true })
      .order("departure_time", { ascending: true });

    if (date) {
      departuresQuery = departuresQuery.eq("departure_date", date);
    }

    if (routeId) {
      departuresQuery = departuresQuery.eq("route_id", routeId);
    }

    const { data: departures, error: departuresError } = await departuresQuery;

    if (departuresError) throw departuresError;

    const results: any[] = [];

    for (const lineStop of usableLineStops) {
      const line = Array.isArray(lineStop.shuttle_lines)
        ? lineStop.shuttle_lines[0]
        : lineStop.shuttle_lines;

      const route = Array.isArray(line?.shuttle_routes)
        ? line.shuttle_routes[0]
        : line?.shuttle_routes;

      const stop = Array.isArray(lineStop.shuttle_stops)
        ? lineStop.shuttle_stops[0]
        : lineStop.shuttle_stops;

      if (!line || !route || !stop) continue;

      const matchingDepartures = (departures || []).filter((departure: any) => {
        if (departure.route_id !== route.id) return false;
        if (seatsLeft(departure) < passengers) return false;
        return true;
      });

      for (const departure of matchingDepartures) {
        const unitPrice =
          Number(lineStop.price || 0) ||
          Number(departure.price || 0) ||
          Number(route.default_price || 0);

        results.push({
          id: `${departure.id}-${lineStop.id}`,

          departure_id: departure.id,
          line_stop_id: lineStop.id,
          line_id: line.id,
          route_id: route.id,

          route_name: route.name,
          route_code: route.route_code,
          airport_name: route.airport_name,
          start_city: route.start_city,
          end_city: route.end_city,

          line_name: line.name,
          line_code: line.code,

          from_stop_id: stop.id,
          from_stop_name: stop.name,
          from_city: stop.city,
          from_address: stop.address,

          pickup_time: time(lineStop.departure_time),
          arrival_time: time(lineStop.arrival_time),

          departure_date: departure.departure_date,
          departure_time: time(departure.departure_time),
          return_date: departure.return_date,
          return_time: time(departure.return_time),

          capacity: Number(departure.capacity || 0),
          booked_count: Number(departure.booked_count || 0),
          seats_left: seatsLeft(departure),

          unit_price: unitPrice,
          total_price: unitPrice * passengers,
          currency: "SEK",

          status: departure.status,
          booking_deadline: departure.booking_deadline || null,
        });
      }
    }

    const sortedResults = results.sort((a, b) => {
      const aKey = `${a.departure_date || ""} ${a.pickup_time || a.departure_time || ""}`;
      const bKey = `${b.departure_date || ""} ${b.pickup_time || b.departure_time || ""}`;
      return aKey.localeCompare(bKey);
    });

    return res.status(200).json({
      ok: true,
      query: {
        from_stop_id: fromStopId || null,
        route_id: routeId || null,
        line_id: lineId || null,
        date: date || null,
        passengers,
      },
      count: sortedResults.length,
      results: sortedResults,
      meta: {
        line_ids: lineIds,
      },
    });
  } catch (e: any) {
    console.error("/api/public/shuttle/search error:", e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte söka flygbussavgångar.",
    });
  }
}
