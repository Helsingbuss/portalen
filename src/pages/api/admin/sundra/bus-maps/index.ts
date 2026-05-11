import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

function buildSeats(busMapId: string, rows: number, columns: string[]) {
  const seats: any[] = [];

  for (let row = 1; row <= rows; row++) {
    for (const col of columns) {
      seats.push({
        bus_map_id: busMapId,
        seat_number: `${row}${col}`,
        row_number: row,
        seat_column: col,
        seat_type: "standard",
        seat_label: null,
        seat_price: 0,
        is_active: true,
        is_selectable: true,
        is_blocked: false,
        updated_at: new Date().toISOString(),
      });
    }
  }

  return seats;
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

      const rows = Number(body.rows || 14);
      const columns = Array.isArray(body.columns)
        ? body.columns
        : ["A", "B", "C", "D"];

      const seatsCount = rows * columns.length;

      const { data: busMap, error: mapError } = await supabase
        .from("sundra_bus_maps")
        .insert({
          name: body.name,
          bus_type: body.bus_type || "standard",
          seats_count: seatsCount,
          description: body.description || null,
          status: body.status || "active",
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (mapError) throw mapError;

      const seats = buildSeats(busMap.id, rows, columns);

      const { error: seatsError } = await supabase
        .from("sundra_bus_map_seats")
        .insert(seats);

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
