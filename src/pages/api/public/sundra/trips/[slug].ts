import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function seatsLeft(departure: any) {
  return Math.max(
    0,
    Number(departure.capacity || 0) - Number(departure.booked_count || 0)
  );
}

function sortDepartures(departures: any[] = []) {
  return [...departures].sort((a, b) => {
    const aDate = `${a.departure_date || ""} ${a.departure_time || ""}`;
    const bDate = `${b.departure_date || ""} ${b.departure_time || ""}`;
    return aDate.localeCompare(bDate);
  });
}

function sortStops(stops: any[] = []) {
  return [...stops]
    .filter((stop) => stop.is_active !== false)
    .sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0))
    .map((stop) => ({
      id: stop.id,
      stop_name: stop.stop_name,
      stop_city: stop.stop_city,
      departure_time: stop.departure_time
        ? String(stop.departure_time).slice(0, 5)
        : null,
      price: Number(stop.price || 0),
      order_index: Number(stop.order_index || 0),
      is_active: stop.is_active !== false,
    }));
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

    const slug = String(req.query.slug || "").trim();

    if (!slug) {
      return res.status(400).json({
        ok: false,
        error: "Slug saknas.",
      });
    }

    const { data: trip, error } = await supabaseAdmin
      .from("sundra_trips")
      .select(`
        *,
        sundra_departures (
          id,
          line_id,
          departure_date,
          departure_time,
          return_date,
          return_time,
          departure_location,
          destination_location,
          price,
          capacity,
          booked_count,
          status,
          bus_map_id,
          sundra_lines (
            id,
            name,
            code,
            color,
            start_city,
            end_city,
            status,
            sundra_line_stops (
              id,
              line_id,
              stop_name,
              stop_city,
              departure_time,
              price,
              order_index,
              is_active
            )
          )
        )
      `)
      .eq("slug", slug)
      .eq("status", "published")
      .single();

    if (error || !trip) {
      return res.status(404).json({
        ok: false,
        error: "Resan hittades inte.",
      });
    }

    const departures = sortDepartures(trip.sundra_departures || [])
      .filter((d: any) => d.status === "open")
      .map((d: any) => {
        const line = Array.isArray(d.sundra_lines)
          ? d.sundra_lines[0]
          : d.sundra_lines;

        const stops = sortStops(line?.sundra_line_stops || []);

        const cheapestStopPrice =
          stops.length > 0
            ? Math.min(...stops.map((s: any) => Number(s.price || 0)))
            : null;

        const fallbackPrice = Number(d.price || trip.price_from || 0);

        return {
          id: d.id,
          line_id: d.line_id,

          departure_date: d.departure_date,
          departure_time: d.departure_time,
          return_date: d.return_date,
          return_time: d.return_time,

          departure_location: d.departure_location,
          destination_location: d.destination_location,

          price: cheapestStopPrice || fallbackPrice,
          base_price: fallbackPrice,

          capacity: Number(d.capacity || 0),
          booked_count: Number(d.booked_count || 0),
          seats_left: seatsLeft(d),

          bus_map_id: d.bus_map_id,
          has_seat_map: Boolean(d.bus_map_id),

          line: line
            ? {
                id: line.id,
                name: line.name,
                code: line.code,
                color: line.color,
                start_city: line.start_city,
                end_city: line.end_city,
                stops,
              }
            : null,
        };
      });

    return res.status(200).json({
      ok: true,
      trip: {
        ...trip,
        departures,
      },
    });
  } catch (e: any) {
    console.error("/api/public/sundra/trips/[slug] error:", e?.message || e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Serverfel",
    });
  }
}
