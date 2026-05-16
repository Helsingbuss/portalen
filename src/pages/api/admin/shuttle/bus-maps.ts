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
        .from("shuttle_bus_maps")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        bus_maps: data || [],
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};

      const { data, error } = await supabase
        .from("shuttle_bus_maps")
        .insert({
          name: body.name,
          bus_type: body.bus_type || null,
          seats_count: Number(body.seats_count || 0),
          description: body.description || null,
          status: body.status || "active",
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        bus_map: data,
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
