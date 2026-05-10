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
        .from("sundra_departures")
        .select(`
          *,
          sundra_trips (
            id,
            title,
            destination,
            image_url
          ),
          sundra_lines (
            id,
            name,
            code,
            color
          )
        `)
        .eq("id", id)
        .single();

      if (error) {
        throw error;
      }

      return res.status(200).json({
        ok: true,
        departure: data,
      });
    }

    // =========================
    // PUT
    // =========================
    if (req.method === "PUT") {
      const body = req.body || {};

      const updateData = {
        trip_id:
          body.trip_id || null,

        line_id:
          body.line_id || null,

        departure_date:
          body.departure_date || null,

        departure_time:
          body.departure_time || null,

        return_date:
          body.return_date || null,

        return_time:
          body.return_time || null,

        departure_location:
          body.departure_location || null,

        destination_location:
          body.destination_location || null,

        capacity:
          Number(body.capacity || 0),

        booked_count:
          Number(body.booked_count || 0),

        status:
          body.status || "open",

        notes:
          body.notes || null,

        updated_at:
          new Date().toISOString(),
      };

      const { data, error } =
        await supabase
          .from("sundra_departures")
          .update(updateData)
          .eq("id", id)
          .select()
          .single();

      if (error) {
        throw error;
      }

      return res.status(200).json({
        ok: true,
        departure: data,
      });
    }

    // =========================
    // DELETE
    // =========================
    if (req.method === "DELETE") {
      const { error } =
        await supabase
          .from("sundra_departures")
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
      "/api/admin/sundra/departures/[id] error:",
      e
    );

    return res.status(500).json({
      ok: false,
      error:
        e?.message ||
        "Kunde inte hantera avgång.",
    });
  }
}
