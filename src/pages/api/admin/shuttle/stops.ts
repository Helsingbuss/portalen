import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("shuttle_stops")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        stops: data || [],
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};

      if (!body.name?.trim()) {
        return res.status(400).json({
          ok: false,
          error: "Hållplatsnamn saknas.",
        });
      }

      const { data, error } = await supabase
        .from("shuttle_stops")
        .insert({
          name: body.name.trim(),
          city: body.city || null,
          address: body.address || null,
          stop_code: body.stop_code || null,

          latitude:
            body.latitude === "" || body.latitude === null || body.latitude === undefined
              ? null
              : Number(body.latitude),

          longitude:
            body.longitude === "" || body.longitude === null || body.longitude === undefined
              ? null
              : Number(body.longitude),

          description: body.description || null,
          sort_order: Number(body.sort_order || 0),

          status: body.status || "active",
          active: body.active !== false,

          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

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
    console.error("/api/admin/shuttle/stops error:", e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte hantera hållplatser.",
    });
  }
}
