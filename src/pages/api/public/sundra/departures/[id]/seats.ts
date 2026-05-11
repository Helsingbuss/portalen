import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

function sortSeats(seats: any[] = []) {
  const order: Record<string, number> = {
    A: 1,
    B: 2,
    C: 3,
    D: 4,
  };

  return [...seats].sort((a, b) => {
    const colA = String(a.seat_column || "").toUpperCase();
    const colB = String(b.seat_column || "").toUpperCase();

    const colDiff = (order[colA] || 99) - (order[colB] || 99);
    if (colDiff !== 0) return colDiff;

    return Number(a.row_number || 0) - Number(b.row_number || 0);
  });
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
          bus_type,
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

    const busMap = Array.isArray(departure.sundra_bus_maps)
      ? departure.sundra_bus_maps[0]
      : departure.sundra_bus_maps;

    if (!departure.bus_map_id || !busMap) {
      return res.status(200).json({
        ok: true,
        departure_id: id,
        bus_map: null,
        seats: [],
        message: "Ingen platskarta är kopplad till denna avgång.",
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

    if (passengerError) throw passengerError;

    const occupiedSeats = new Set(
      (passengers || [])
        .filter((p: any) => {
          const booking = Array.isArray(p.sundra_bookings)
            ? p.sundra_bookings[0]
            : p.sundra_bookings;

          return (
            String(booking?.departure_id) === String(id) &&
            booking?.status !== "cancelled" &&
            booking?.payment_status !== "refunded"
          );
        })
        .map((p: any) => String(p.seat_number).toUpperCase())
    );

    const seats = sortSeats(busMap?.sundra_bus_map_seats || []).map(
      (seat: any) => {
        const seatNumber = String(seat.seat_number || "").toUpperCase();

        const occupied = occupiedSeats.has(seatNumber);
        const blocked = Boolean(seat.is_blocked);
        const active = seat.is_active !== false;
        const selectable = seat.is_selectable !== false;

        const isAvailable = active && selectable && !blocked && !occupied;

        return {
          id: seat.id,
          seat_number: seatNumber,
          row_number: seat.row_number,
          seat_column: seat.seat_column,

          seat_type: seat.seat_type || "standard",
          seat_label: seat.seat_label || null,
          seat_price: Number(seat.seat_price || 0),

          is_active: active,
          is_selectable: selectable,
          is_blocked: blocked,

          is_occupied: occupied,
          is_available: isAvailable,

          status: blocked || occupied ? "occupied" : "available",
        };
      }
    );

    return res.status(200).json({
      ok: true,
      departure_id: id,
      bus_map: {
        id: busMap.id,
        name: busMap.name,
        bus_type: busMap.bus_type,
        seats_count: busMap.seats_count,
      },
      seats,
      occupied_count: seats.filter((seat: any) => seat.is_occupied).length,
      available_count: seats.filter((seat: any) => seat.is_available).length,
    });
  } catch (e: any) {
    console.error("/api/public/sundra/departures/[id]/seats error:", e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte hämta säten.",
    });
  }
}
