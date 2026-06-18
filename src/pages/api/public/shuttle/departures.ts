import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/supabaseAdmin";

const db = requireAdmin();

function text(value: any, fallback = "") {
  const next = String(value ?? "").trim();
  return next || fallback;
}

function tidyTime(value: any) {
  const next = text(value);
  if (!next) return null;

  if (/^\d{1,2}:\d{2}/.test(next)) {
    const [hours, minutes] = next.split(":");
    return `${hours.padStart(2, "0")}:${minutes}`;
  }

  if (/^\d{4}$/.test(next)) {
    return `${next.slice(0, 2)}:${next.slice(2, 4)}`;
  }

  if (/^\d{3}$/.test(next)) {
    return `0${next.slice(0, 1)}:${next.slice(1, 3)}`;
  }

  return next;
}

function numberValue(value: any, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  try {
    const date = text(req.query.date);
    const line = text(req.query.line);
    const direction = text(req.query.direction);

    let query = db
      .from("shuttle_departures")
      .select(
        "id, route_id, line_id, departure_date, departure_time, departure_location, destination_location, price, capacity, booked_count, status, direction"
      )
      .order("departure_date", { ascending: true })
      .order("departure_time", { ascending: true });

    if (date) query = query.eq("departure_date", date);
    if (direction) query = query.eq("direction", direction);

    const { data: departures, error: departuresError } = await query;

    if (departuresError) throw departuresError;

    const rows = departures || [];

    if (rows.length === 0) {
      return res.status(200).json({
        ok: true,
        count: 0,
        departures: [],
      });
    }

    const lineIds = Array.from(new Set(rows.map((row: any) => row.line_id).filter(Boolean)));
    const routeIds = Array.from(new Set(rows.map((row: any) => row.route_id).filter(Boolean)));
    const departureIds = rows.map((row: any) => row.id);

    const { data: lines, error: linesError } = await db
      .from("shuttle_lines")
      .select("id, name, code, route_id")
      .in("id", lineIds.length ? lineIds : ["00000000-0000-0000-0000-000000000000"]);

    if (linesError) throw linesError;

    const { data: routes, error: routesError } = await db
      .from("shuttle_routes")
      .select("id, name, code, operator_name, estimated_duration_minutes")
      .in("id", routeIds.length ? routeIds : ["00000000-0000-0000-0000-000000000000"]);

    if (routesError) throw routesError;

    const { data: departureStops, error: departureStopsError } = await db
      .from("shuttle_departure_stops")
      .select("id, departure_id, stop_id, line_stop_id, stop_order, departure_time, price, direction, is_return")
      .in("departure_id", departureIds)
      .order("stop_order", { ascending: true });

    if (departureStopsError) throw departureStopsError;

    const stopIds = Array.from(
      new Set((departureStops || []).map((stop: any) => stop.stop_id).filter(Boolean))
    );

    const lineStopIds = Array.from(
      new Set((departureStops || []).map((stop: any) => stop.line_stop_id).filter(Boolean))
    );

    const { data: stops, error: stopsError } = await db
      .from("shuttle_stops")
      .select("id, name, city")
      .in("id", stopIds.length ? stopIds : ["00000000-0000-0000-0000-000000000000"]);

    if (stopsError) throw stopsError;

    const { data: lineStops, error: lineStopsError } = await db
      .from("shuttle_line_stops")
      .select("id, stop_id, stop_order, departure_time, arrival_time, price")
      .in("id", lineStopIds.length ? lineStopIds : ["00000000-0000-0000-0000-000000000000"]);

    if (lineStopsError) throw lineStopsError;

    const lineMap = new Map((lines || []).map((item: any) => [item.id, item]));
    const routeMap = new Map((routes || []).map((item: any) => [item.id, item]));
    const stopMap = new Map((stops || []).map((item: any) => [item.id, item]));
    const lineStopMap = new Map((lineStops || []).map((item: any) => [item.id, item]));

    const stopsByDeparture = new Map<string, any[]>();

    for (const departureStop of departureStops || []) {
      const list = stopsByDeparture.get(departureStop.departure_id) || [];
      list.push(departureStop);
      stopsByDeparture.set(departureStop.departure_id, list);
    }

    const result = rows
      .filter((row: any) => {
        if (!line) return true;
        const lineInfo = lineMap.get(row.line_id);
        return String(lineInfo?.code || lineInfo?.name || "") === line;
      })
      .map((row: any) => {
        const lineInfo = lineMap.get(row.line_id);
        const routeInfo = routeMap.get(row.route_id);

        const rawStops = (stopsByDeparture.get(row.id) || []).sort(
          (a: any, b: any) => numberValue(a.stop_order) - numberValue(b.stop_order)
        );

        const mappedStops = rawStops.map((departureStop: any, index: number) => {
          const stopInfo = stopMap.get(departureStop.stop_id);
          const lineStopInfo = lineStopMap.get(departureStop.line_stop_id);

          const stopTime =
            tidyTime(departureStop.departure_time) ||
            tidyTime(lineStopInfo?.departure_time) ||
            tidyTime(lineStopInfo?.arrival_time);

          return {
            id: departureStop.id,
            lineStopId: departureStop.line_stop_id || null,
            stopId: departureStop.stop_id || null,
            name: stopInfo?.name || "Hallplats",
            city: stopInfo?.city || null,
            order: numberValue(departureStop.stop_order, index + 1),
            time: stopTime,
            price: numberValue(departureStop.price, 0),
            direction: departureStop.direction || row.direction || "outbound",
            isReturn: departureStop.is_return === true,
          };
        });

        const firstStop = mappedStops[0];
        const lastStop = mappedStops[mappedStops.length - 1];

        const departureTime = tidyTime(firstStop?.time) || tidyTime(row.departure_time);
        const arrivalTime = tidyTime(lastStop?.time);

        return {
          id: row.id,
          departureId: row.id,
          routeId: row.route_id,
          lineId: row.line_id,
          line: text(lineInfo?.code || lineInfo?.name, "Linje"),
          lineCode: lineInfo?.code || null,
          lineName: lineInfo?.name || null,
          routeName: routeInfo?.name || null,
          routeCode: routeInfo?.code || null,
          date: row.departure_date,
          departureDate: row.departure_date,
          departureTime,
          arrivalTime,
          durationMinutes: numberValue(routeInfo?.estimated_duration_minutes, 40),
          from: firstStop?.name || row.departure_location || "",
          to: lastStop?.name || row.destination_location || "",
          departureLocation: row.departure_location || firstStop?.name || "",
          destinationLocation: row.destination_location || lastStop?.name || "",
          price: numberValue(row.price, 0),
          ticketPrice: numberValue(row.price, 0),
          capacity: numberValue(row.capacity, 49),
          bookedCount: numberValue(row.booked_count, 0),
          seatsLeft: Math.max(numberValue(row.capacity, 49) - numberValue(row.booked_count, 0), 0),
          status: row.status || "open",
          direction: row.direction || "outbound",
          isReturn: row.direction === "return",
          vehicle: routeInfo?.operator_name || "Helsingbuss",
          operatorName: routeInfo?.operator_name || "Helsingbuss",
          comfort: "standard",
          ticketType: "Enkel",
          stops: mappedStops,
          visibleStops: mappedStops,
        };
      });

    return res.status(200).json({
      ok: true,
      count: result.length,
      departures: result,
    });
  } catch (error: any) {
    console.error("Public shuttle departures error:", error);

    return res.status(500).json({
      ok: false,
      message: error?.message || "Could not load departures",
    });
  }
}
