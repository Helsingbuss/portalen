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
    // =========================
    // GET
    // =========================
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("sundra_vehicles")
        .select(`
          *,
          sundra_bus_maps (
            id,
            name,
            seats_count
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return res.status(200).json({
        ok: true,
        vehicles: data || [],
      });
    }

    // =========================
    // POST
    // =========================
    if (req.method === "POST") {
      const body = req.body || {};

      if (!body.name) {
        return res.status(400).json({
          ok: false,
          error: "Namn saknas.",
        });
      }

      const insertData = {
        name: body.name,

        registration_number:
          body.registration_number || null,

        operator_name:
          body.operator_name || null,

        vehicle_type:
          body.vehicle_type || "coach",

        seats_count:
          Number(body.seats_count || 0),

        bus_map_id:
          body.bus_map_id || null,

        status:
          body.status || "active",

        notes:
          body.notes || null,

        created_at:
          new Date().toISOString(),

        updated_at:
          new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("sundra_vehicles")
        .insert(insertData)
        .select(`
          *,
          sundra_bus_maps (
            id,
            name,
            seats_count
          )
        `)
        .single();

      if (error) {
        throw error;
      }

      return res.status(200).json({
        ok: true,
        vehicle: data,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (e: any) {
    console.error(
      "/api/admin/sundra/vehicles error:",
      e
    );

    return res.status(500).json({
      ok: false,
      error:
        e?.message ||
        "Kunde inte hantera fordon.",
    });
  }
}
