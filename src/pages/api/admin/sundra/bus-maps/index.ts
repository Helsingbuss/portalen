import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

type SeatDef = {
  seat_number: string;
  row_number: number;
  seat_column: string;
};

function buildTourismo57SeatNumbers(): SeatDef[] {
  const seats: SeatDef[] = [];

  for (let i = 1; i <= 12; i++) {
    seats.push({
      seat_number: `A${i}`,
      row_number: i,
      seat_column: "A",
    });
  }

  for (let i = 1; i <= 12; i++) {
    seats.push({
      seat_number: `B${i}`,
      row_number: i,
      seat_column: "B",
    });
  }

  for (let i = 1; i <= 14; i++) {
    seats.push({
      seat_number: `C${i}`,
      row_number: i,
      seat_column: "C",
    });
  }

  for (let i = 1; i <= 18; i++) {
    seats.push({
      seat_number: `D${i}`,
      row_number: i,
      seat_column: "D",
    });
  }

  return seats;
}

function buildStandardSeatNumbers(rows: number, columns: string[]): SeatDef[] {
  const seats: SeatDef[] = [];

  for (let row = 1; row <= rows; row++) {
    for (const col of columns) {
      seats.push({
        seat_number: `${col}${row}`,
        row_number: row,
        seat_column: col,
      });
    }
  }

  return seats;
}

function getSeatDefinitions(template: string, rowsInput: number, columnsInput?: string[]) {
  if (template === "tourismo_57") {
    return buildTourismo57SeatNumbers();
  }

  const columns =
    Array.isArray(columnsInput) && columnsInput.length > 0
      ? columnsInput
      : ["A", "B", "C", "D"];

  if (template === "standard_52") {
    return buildStandardSeatNumbers(13, columns);
  }

  if (template === "sprinter_19") {
    return buildStandardSeatNumbers(5, columns).filter(
      (seat) => seat.seat_number !== "D5"
    );
  }

  if (template === "doubledeck_81") {
    return [
      ...buildStandardSeatNumbers(20, columns),
      {
        seat_number: "A21",
        row_number: 21,
        seat_column: "A",
      },
    ];
  }

  return buildStandardSeatNumbers(Number(rowsInput || 13), columns);
}

function buildSeats(
  busMapId: string,
  template: string,
  rowsInput: number,
  columnsInput?: string[]
) {
  const now = new Date().toISOString();

  return getSeatDefinitions(template, rowsInput, columnsInput).map((seat) => ({
    bus_map_id: busMapId,

    seat_number: seat.seat_number,
    row_number: seat.row_number,
    seat_column: seat.seat_column,

    seat_type: "standard",
    seat_label: null,
    seat_price: 0,

    is_active: true,
    is_selectable: true,
    is_blocked: false,

    created_at: now,
    updated_at: now,
  }));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("sundra_bus_maps")
        .select(`
          *,
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
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        bus_maps: data || [],
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};

      if (!body.name?.trim()) {
        return res.status(400).json({
          ok: false,
          error: "Namn på busskarta saknas.",
        });
      }

      const template = body.bus_type || body.template || "standard_52";
      const rows = Number(body.rows || 13);
      const columns = Array.isArray(body.columns)
        ? body.columns
        : ["A", "B", "C", "D"];

      const tempSeats = buildSeats("TEMP_ID", template, rows, columns);
      const seatsCount = tempSeats.length;

      const { data: busMap, error: mapError } = await supabase
        .from("sundra_bus_maps")
        .insert({
          name: body.name,
          bus_type: template,
          seats_count: seatsCount,
          description: body.description || null,
          status: body.status || "active",
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (mapError) throw mapError;

      const finalSeats = buildSeats(busMap.id, template, rows, columns);

      const { error: seatsError } = await supabase
        .from("sundra_bus_map_seats")
        .insert(finalSeats);

      if (seatsError) throw seatsError;

      const { data: fullMap, error: fullError } = await supabase
        .from("sundra_bus_maps")
        .select(`
          *,
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
        `)
        .eq("id", busMap.id)
        .single();

      if (fullError) throw fullError;

      return res.status(201).json({
        ok: true,
        bus_map: fullMap,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (e: any) {
    console.error("/api/admin/sundra/bus-maps error:", e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte hantera busskartor.",
    });
  }
}
