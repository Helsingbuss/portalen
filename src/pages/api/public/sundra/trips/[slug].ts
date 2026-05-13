import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function seatsLeft(departure: any) {
  return Math.max(
    0,
    Number(departure.capacity || 0) -
      Number(departure.booked_count || 0)
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
          bus_map_id
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

    const departures = (trip.sundra_departures || [])
      .filter((d: any) => d.status === "open")
      .map((d: any) => ({
        id: d.id,
        departure_date: d.departure_date,
        departure_time: d.departure_time,
        return_date: d.return_date,
        return_time: d.return_time,
        departure_location: d.departure_location,
        destination_location: d.destination_location,
        price: Number(d.price || trip.price_from || 0),
        capacity: Number(d.capacity || 0),
        booked_count: Number(d.booked_count || 0),
        seats_left: seatsLeft(d),
        bus_map_id: d.bus_map_id,
        has_seat_map: Boolean(d.bus_map_id),
      }));

    return res.status(200).json({
      ok: true,
      trip: {
        ...trip,
        departures,
      },
    });
  } catch (e: any) {
    console.error(e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Serverfel",
    });
  }
}
