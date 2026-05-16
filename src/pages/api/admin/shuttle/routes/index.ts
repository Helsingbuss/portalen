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
        .from("shuttle_routes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        routes: data || [],
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};

      if (!body.name?.trim()) {
        return res.status(400).json({
          ok: false,
          error: "Ruttnamn saknas.",
        });
      }

      const { data, error } = await supabase
        .from("shuttle_routes")
        .insert({
          name: body.name.trim(),
          route_code: body.route_code || null,

          airport_name: body.airport_name || null,
          start_city: body.start_city || null,
          end_city: body.end_city || null,

          start_location: body.start_location || null,
          end_location: body.end_location || null,

          default_price:
            body.default_price === "" || body.default_price === null || body.default_price === undefined
              ? 0
              : Number(body.default_price),

          estimated_duration_minutes:
            body.estimated_duration_minutes === "" || body.estimated_duration_minutes === null || body.estimated_duration_minutes === undefined
              ? 0
              : Number(body.estimated_duration_minutes),

          operator_name: body.operator_name || null,
          color: body.color || "#194C66",

          description: body.description || null,
          status: body.status || "active",

          is_public: body.is_public !== false,
          is_featured: body.is_featured === true,

          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        route: data,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (e: any) {
    console.error("/api/admin/shuttle/routes error:", e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte hantera rutter.",
    });
  }
}
