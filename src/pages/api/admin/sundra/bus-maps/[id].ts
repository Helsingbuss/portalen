import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

function sortSeats(seats: any[] = []) {
  return [...seats].sort((a, b) => {
    const rowA = Number(a.row_number || 0);
    const rowB = Number(b.row_number || 0);

    if (rowA !== rowB) return rowA - rowB;

    return String(a.seat_column || "").localeCompare(
      String(b.seat_column || "")
    );
  });
}

function normalizeBusMap(map: any) {
  if (!map) return map;

  return {
    ...map,
    sundra_bus_map_seats: sortSeats(map.sundra_bus_map_seats || []),
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const id = String(req.query.id || "");

  if (!id) {
    return res.status(400).json({
      ok: false,
      error: "ID saknas.",
    });
  }

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
        .eq("id", id)
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        bus_map: normalizeBusMap(data),
      });
    }

    if (req.method === "PUT" || req.method === "PATCH") {
      const body = req.body || {};

      const mapUpdate: any = {
        updated_at: new Date().toISOString(),
      };

      if (body.name !== undefined) {
        mapUpdate.name = body.name || "Platskarta";
      }

      if (body.bus_type !== undefined) {
        mapUpdate.bus_type = body.bus_type || "standard_52";
      }

      if (body.description !== undefined) {
        mapUpdate.description = body.description || null;
      }

      if (body.status !== undefined) {
        mapUpdate.status = body.status || "active";
      }

      const { error: updateError } = await supabase
        .from("sundra_bus_maps")
        .update(mapUpdate)
        .eq("id", id);

      if (updateError) throw updateError;

      if (Array.isArray(body.seats)) {
        for (const seat of body.seats) {
          if (!seat.id) continue;

          const { error: seatError } = await supabase
            .from("sundra_bus_map_seats")
            .update({
              seat_type: seat.seat_type || "standard",
              seat_label: seat.seat_label || null,
              seat_price: Number(seat.seat_price || 0),
              is_active: seat.is_active ?? true,
              is_selectable: seat.is_selectable ?? true,
              is_blocked: seat.is_blocked ?? false,
              updated_at: new Date().toISOString(),
            })
            .eq("id", seat.id)
            .eq("bus_map_id", id);

          if (seatError) throw seatError;
        }
      }

      const { data: finalMap, error: finalError } = await supabase
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
        .eq("id", id)
        .single();

      if (finalError) throw finalError;

      return res.status(200).json({
        ok: true,
        bus_map: normalizeBusMap(finalMap),
      });
    }

    if (req.method === "DELETE") {
      const { error } = await supabase
        .from("sundra_bus_maps")
        .delete()
        .eq("id", id);

      if (error) throw error;

      return res.status(200).json({
        ok: true,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (e: any) {
    console.error("/api/admin/sundra/bus-maps/[id] error:", e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte hantera busskarta.",
    });
  }
}
