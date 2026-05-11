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
        bus_map: data,
      });
    }

    if (req.method === "PUT") {
      const body = req.body || {};

      const { data: updatedMap, error: updateError } = await supabase
        .from("sundra_bus_maps")
        .update({
          name: body.name,
          bus_type: body.bus_type,
          description: body.description,
          status: body.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (updateError) throw updateError;

      if (Array.isArray(body.seats)) {
        for (const seat of body.seats) {
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
            .eq("id", seat.id);

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
        bus_map: finalMap,
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
