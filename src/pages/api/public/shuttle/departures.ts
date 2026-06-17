import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

function setCors(req: NextApiRequest, res: NextApiResponse) {
  const allowedOrigins = [
    "http://localhost:3000",
    "https://hbshuttle.se",
    "https://www.hbshuttle.se",
  ];

  const origin = String(req.headers.origin || "");

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "https://hbshuttle.se");
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function normalizeText(value: any) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function samePlace(a: any, b: any) {
  const aa = normalizeText(a);
  const bb = normalizeText(b);

  if (!aa || !bb) return false;

  return aa === bb || aa.includes(bb) || bb.includes(aa);
}

function timeToMinutes(value: any) {
  const text = String(value || "");
  const match = text.match(/^(\d{1,2}):(\d{2})/);

  if (!match) return 0;

  return Number(match[1]) * 60 + Number(match[2]);
}

function money(value: any) {
  if (value === "" || value === null || value === undefined) return 0;

  const n = Number(String(value).replace(",", "."));

  return Number.isFinite(n) ? n : 0;
}

function getStopName(stop: any) {
  return (
    stop?.stop_name ||
    stop?.name ||
    stop?.shuttle_stops?.name ||
    stop?.city ||
    "Hållplats"
  );
}

function getStopTime(stop: any) {
  return (
    stop?.scheduled_time ||
    stop?.departure_time ||
    stop?.arrival_time ||
    null
  );
}

function formatDeparture(row: any, query: any) {
  const stops = [...(row.shuttle_departure_stops || [])]
    .sort((a: any, b: any) => Number(a.stop_order || 0) - Number(b.stop_order || 0))
    .map((stop: any) => ({
      id: stop.id,
      lineStopId: stop.line_stop_id,
      stopId: stop.stop_id,
      name: getStopName(stop),
      city: stop.city || null,
      order: Number(stop.stop_order || 0),
      time: getStopTime(stop),
      price: money(stop.price),
      direction: stop.direction || row.direction || "outbound",
      isReturn: Boolean(stop.is_return),
    }));

  const fromQuery = query.from ? String(query.from) : "";
  const toQuery = query.to ? String(query.to) : "";

  const fromStop =
    stops.find((stop: any) => samePlace(stop.name, fromQuery)) ||
    stops[0] ||
    null;

  const toStop =
    stops.find((stop: any) => samePlace(stop.name, toQuery)) ||
    stops[stops.length - 1] ||
    null;

  const fromIndex = fromStop ? stops.findIndex((s: any) => s.id === fromStop.id) : 0;
  const toIndex = toStop ? stops.findIndex((s: any) => s.id === toStop.id) : stops.length - 1;

  const visibleStops =
    fromIndex >= 0 && toIndex >= 0 && fromIndex <= toIndex
      ? stops.slice(fromIndex, toIndex + 1)
      : stops;

  const departureTime =
    getStopTime(fromStop) ||
    row.departure_time ||
    null;

  const arrivalTime =
    getStopTime(toStop) ||
    visibleStops[visibleStops.length - 1]?.time ||
    row.arrival_time ||
    null;

  const stopPrice = money(fromStop?.price);
  const rowPrice = money(row.price);
  const ticketPrice = stopPrice > 0 ? stopPrice : rowPrice;

  const departureMinutes = timeToMinutes(departureTime);
  const arrivalMinutes = timeToMinutes(arrivalTime);
  const durationMinutes =
    arrivalMinutes >= departureMinutes
      ? arrivalMinutes - departureMinutes
      : null;

  const line = row.shuttle_lines || {};
  const route = row.shuttle_routes || {};

  return {
    id: row.id,
    departureId: row.id,

    routeId: row.route_id,
    lineId: row.line_id,

    line: line.code ? `Linje ${line.code}` : line.name || "HB Shuttle",
    lineCode: line.code || null,
    lineName: line.name || null,

    routeName: route.name || null,
    routeCode: route.route_code || null,

    date: row.departure_date,
    departureDate: row.departure_date,

    departureTime,
    arrivalTime,
    durationMinutes,

    from: fromStop?.name || row.departure_location || line.start_city || null,
    to: toStop?.name || row.destination_location || line.end_city || null,

    departureLocation: row.departure_location,
    destinationLocation: row.destination_location,

    price: ticketPrice,
    ticketPrice,

    capacity: Number(row.capacity || 0),
    bookedCount: Number(row.booked_count || 0),
    seatsLeft: Math.max(Number(row.capacity || 0) - Number(row.booked_count || 0), 0),

    status: row.status || "open",
    direction: row.direction || "outbound",
    isReturn: Boolean(row.is_return),

    vehicle: row.vehicle_name || "HB Shuttle",
    comfort: row.comfort || "standard",
    ticketType: row.ticket_type || "Enkel",

    stops,
    visibleStops,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  try {
    const { date, line_id, lineCode, direction } = req.query;

    let query = supabase
      .from("shuttle_departures")
      .select(`
        *,
        shuttle_routes (
          id,
          name,
          route_code,
          airport_name,
          from_city,
          to_city,
          start_city,
          end_city
        ),
        shuttle_lines (
          id,
          name,
          code,
          start_city,
          end_city
        ),
        shuttle_departure_stops (
          id,
          departure_id,
          line_id,
          line_stop_id,
          stop_id,
          stop_name,
          city,
          stop_order,
          scheduled_time,
          price,
          direction,
          is_return
        )
      `)
      .order("departure_date", { ascending: true })
      .order("departure_time", { ascending: true });

    if (date) {
      query = query.eq("departure_date", String(date));
    }

    if (line_id) {
      query = query.eq("line_id", String(line_id));
    }

    if (direction) {
      query = query.eq("direction", String(direction));
    }

    query = query.in("status", ["open", "active", "scheduled"]);

    const { data, error } = await query;

    if (error) throw error;

    let departures = (data || []).map((row: any) => formatDeparture(row, req.query));

    if (lineCode) {
      const wantedLineCode = normalizeText(lineCode);
      departures = departures.filter((departure: any) =>
        normalizeText(departure.lineCode) === wantedLineCode ||
        normalizeText(departure.line).includes(wantedLineCode)
      );
    }

    if (req.query.from || req.query.to) {
      departures = departures.filter((departure: any) => {
        const hasFrom = req.query.from
          ? departure.stops.some((stop: any) => samePlace(stop.name, req.query.from))
          : true;

        const hasTo = req.query.to
          ? departure.stops.some((stop: any) => samePlace(stop.name, req.query.to))
          : true;

        return hasFrom && hasTo;
      });
    }

    return res.status(200).json({
      ok: true,
      count: departures.length,
      departures,
    });
  } catch (e: any) {
    console.error("/api/public/shuttle/departures error:", e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte hämta avgångar.",
      departures: [],
    });
  }
}
