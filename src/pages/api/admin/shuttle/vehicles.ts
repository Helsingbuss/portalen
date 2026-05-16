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
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("shuttle_vehicles")
        .select(`
          *,
          shuttle_bus_maps (
            id,
            name,
            seats_count
          )
        `)
        .order("created_at", {
          ascending: false,
        });

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        vehicles: data || [],
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};

      const { data, error } = await supabase
        .from("shuttle_vehicles")
        .insert({
          name: body.name,

          registration_number:
            body.registration_number || null,

          operator_name:
            body.operator_name || null,

          vehicle_model:
            body.vehicle_model || null,

          bus_type:
            body.bus_type || null,

          seats_count:
            Number(body.seats_count || 0),

          shuttle_bus_map_id:
            body.shuttle_bus_map_id || null,

          wifi:
            Boolean(body.wifi),

          usb_outlets:
            Boolean(body.usb_outlets),

          toilet:
            Boolean(body.toilet),

          wheelchair_accessible:
            Boolean(body.wheelchair_accessible),

          notes:
            body.notes || null,

          status:
            body.status || "active",

          updated_at:
            new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        vehicle: data,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (e: any) {
    console.error(e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Serverfel",
    });
  }
}
