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
        .from("sundra_stops")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      return res.status(200).json({
        ok: true,
        stops: data || [],
      });
    }

    // =========================
    // POST
    // =========================
    if (req.method === "POST") {
      const body = req.body || {};

      if (!body.name?.trim()) {
        return res.status(400).json({
          ok: false,
          error: "Hållplatsnamn saknas.",
        });
      }

      const insertData = {
        name: body.name,

        city: body.city || null,
        address: body.address || null,

        stop_code: body.stop_code || null,

        latitude:
          body.latitude !== ""
            ? Number(body.latitude)
            : null,

        longitude:
          body.longitude !== ""
            ? Number(body.longitude)
            : null,

        description:
          body.description || null,

        status:
          body.status || "active",

        updated_at:
          new Date().toISOString(),
      };

      const { data, error } =
        await supabase
          .from("sundra_stops")
          .insert(insertData)
          .select()
          .single();

      if (error) {
        throw error;
      }

      return res.status(201).json({
        ok: true,
        stop: data,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (e: any) {
    console.error(
      "/api/sundra/admin/stops error:",
      e
    );

    return res.status(500).json({
      ok: false,
      error:
        e?.message ||
        "Kunde inte hantera hållplatser.",
    });
  }
}
