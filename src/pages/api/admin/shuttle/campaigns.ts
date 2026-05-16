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
        .from("shuttle_campaigns")
        .select(`
          *,
          shuttle_routes (
            id,
            name,
            route_code
          ),
          shuttle_departures (
            id,
            departure_date,
            departure_time
          )
        `)
        .order("created_at", {
          ascending: false,
        });

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        campaigns: data || [],
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
          error: "Namn saknas.",
        });
      }

      if (!body.code?.trim()) {
        return res.status(400).json({
          ok: false,
          error: "Kod saknas.",
        });
      }

      const insertData = {
        name: body.name,
        code: String(body.code).toUpperCase(),

        discount_type:
          body.discount_type || "percent",

        discount_percent:
          Number(body.discount_percent || 0),

        discount_amount:
          Number(body.discount_amount || 0),

        valid_from:
          body.valid_from || null,

        valid_until:
          body.valid_until || null,

        max_uses:
          Number(body.max_uses || 0),

        used_count: 0,

        route_id:
          body.route_id || null,

        departure_id:
          body.departure_id || null,

        description:
          body.description || null,

        status:
          body.status || "active",

        updated_at:
          new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("shuttle_campaigns")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        campaign: data,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (e: any) {
    console.error(
      "/api/admin/shuttle/campaigns error:",
      e
    );

    return res.status(500).json({
      ok: false,
      error:
        e?.message ||
        "Kunde inte hantera kampanjer.",
    });
  }
}
