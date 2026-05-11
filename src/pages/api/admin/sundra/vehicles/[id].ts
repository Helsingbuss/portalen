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
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        ok: false,
        error: "ID saknas.",
      });
    }

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
        .eq("id", id)
        .single();

      if (error) {
        throw error;
      }

      return res.status(200).json({
        ok: true,
        vehicle: data,
      });
    }

    // =========================
    // PATCH
    // =========================
    if (
      req.method === "PATCH" ||
      req.method === "PUT"
    ) {
      const body = req.body || {};

      const updateData = {
        name:
          body.name || null,

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

        updated_at:
          new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("sundra_vehicles")
        .update(updateData)
        .eq("id", id)
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

    // =========================
    // DELETE
    // =========================
    if (req.method === "DELETE") {
      const { error } = await supabase
        .from("sundra_vehicles")
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }

      return res.status(200).json({
        ok: true,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (e: any) {
    console.error(
      "/api/admin/sundra/vehicles/[id] error:",
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
