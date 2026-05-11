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
    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
      });
    }

    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        ok: false,
        error: "Avgångs-ID saknas.",
      });
    }

    const { data: departure, error: departureError } = await supabase
      .from("sundra_departures")
      .select(`
        id,
        bus_map_id,
        sundra_bus_maps (
          id,
          name,
          seats_count,
          sundra_bus_map_seats (
            id,
            seat_number,
            row_number,
            seat_column,
            seat_type,
            seat_label,
            seat_price,
            is_active,
            is_selectable,
            is_blocked
          )
        )
      `)
      .eq("id", id)
      .single();

    if (departureError || !departure) {
      return res.status(404).json({
        ok: false,
        error: "Avgången hittades inte.",
      });
    }

    if (!departure.bus_map_id || !departure.sundra_bus_maps) {
      return res.status(200).json({
        ok: true,
        departure_id: id,
        bus_map: null,
        seats: [],
        message: "Ingen busskarta är kopplad till denna avgång.",
      });
    }

    const { data: passengers, error: passengerError } = await supabase
      .from("sundra_booking_passengers")
      .select(`
        id,
        booking_id,
        seat_number,
        sundra_bookings (
          id,
          departure_id,
          status,
          payment_status
        )
      `)
      .not("seat_number", "is", null);

    if (passengerError) {
      throw passengerError;
    }

    const occupiedSeats = new Set(
      (passengers || [])
        .filter((p: any) => {
          const booking = Array.isArray(p.sundra_bookings)
            ? p.sundra_bookings[0]
            : p.sundra_bookings;

          return (
            booking?.departure_id === id &&
            booking?.status !== "cancelled"
          );
        })
        .map((p: any) => p.seat_number)
    );

    const busMap = Array.isArray(departure.sundra_bus_maps)
      ? departure.sundra_bus_maps[0]
      : departure.sundra_bus_maps;

    const seats = (busMap?.sundra_bus_map_seats || [])
      .sort((a: any, b: any) => {
        const rowDiff = Number(a.row_number || 0) - Number(b.row_number || 0);
        if (rowDiff !== 0) return rowDiff;
        return String(a.seat_column || "").localeCompare(
          String(b.seat_column || "")
        );
      })
      .map((seat: any) => {
        const occupied = occupiedSeats.has(seat.seat_number);
        const blocked = Boolean(seat.is_blocked);
        const active = seat.is_active !== false;
        const selectable = seat.is_selectable !== false;

        return {
          id: seat.id,
          seat_number: seat.seat_number,
          row_number: seat.row_number,
          seat_column: seat.seat_column,

          seat_type: seat.seat_type || "standard",
          seat_label: seat.seat_label || null,
          seat_price: Number(seat.seat_price || 0),

          is_active: active,
          is_selectable: selectable,
          is_blocked: blocked,

          is_occupied: occupied,
          is_available: active && selectable && !blocked && !occupied,
        };
      });

    return res.status(200).json({
      ok: true,
      departure_id: id,
      bus_map: {
        id: busMap.id,
        name: busMap.name,
        seats_count: busMap.seats_count,
      },
      seats,
    });
  } catch (e: any) {
    console.error("/api/public/sundra/departures/[id]/seats error:", e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte hämta säten.",
    });
  }
}
