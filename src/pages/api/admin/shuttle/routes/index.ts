import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

function numberOrZero(value: any) {
  if (value === "" || value === null || value === undefined) return 0;

  const n = Number(String(value).replace(",", "."));

  return Number.isFinite(n) ? n : 0;
}

function boolValue(value: any, fallback = false) {
  if (value === true || value === "true" || value === "1") return true;
  if (value === false || value === "false" || value === "0") return false;

  return fallback;
}

function routePayload(body: any) {
  return {
    name: String(body.name || "").trim(),
    route_code: body.route_code || null,

    airport_name: body.airport_name || null,
    start_city: body.start_city || null,
    end_city: body.end_city || null,

    start_location: body.start_location || null,
    end_location: body.end_location || null,

    default_price: numberOrZero(body.default_price),
    estimated_duration_minutes: numberOrZero(body.estimated_duration_minutes),

    operator_name: body.operator_name || null,
    color: body.color || "#194C66",

    description: body.description || null,
    status: body.status || "active",

    is_public: boolValue(body.is_public, true),
    is_featured: boolValue(body.is_featured, false),

    updated_at: new Date().toISOString(),
  };
}

async function countUsedRows(routeId: string) {
  const { count: lineCount, error: lineError } = await supabase
    .from("shuttle_lines")
    .select("id", { count: "exact", head: true })
    .eq("route_id", routeId);

  if (lineError) throw lineError;

  const { count: departureCount, error: departureError } = await supabase
    .from("shuttle_departures")
    .select("id", { count: "exact", head: true })
    .eq("route_id", routeId);

  if (departureError) throw departureError;

  return {
    lineCount: Number(lineCount || 0),
    departureCount: Number(departureCount || 0),
  };
}

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
        .insert(routePayload(body))
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        route: data,
      });
    }

    if (req.method === "PATCH" || req.method === "PUT") {
      const body = req.body || {};
      const id = String(body.id || req.query.id || "");

      if (!id) {
        return res.status(400).json({
          ok: false,
          error: "Rutt-ID saknas.",
        });
      }

      if (!body.name?.trim()) {
        return res.status(400).json({
          ok: false,
          error: "Ruttnamn saknas.",
        });
      }

      const { data, error } = await supabase
        .from("shuttle_routes")
        .update(routePayload(body))
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        route: data,
      });
    }

    if (req.method === "DELETE") {
      const id = String(req.query.id || req.body?.id || "");

      if (!id) {
        return res.status(400).json({
          ok: false,
          error: "Rutt-ID saknas.",
        });
      }

      const usage = await countUsedRows(id);

      if (usage.lineCount > 0 || usage.departureCount > 0) {
        return res.status(409).json({
          ok: false,
          error:
            `Rutten kan inte tas bort eftersom den används av ${usage.lineCount} linje/linjer och ${usage.departureCount} avgång/avgångar. ` +
            "Ändra eller ta bort kopplingarna först.",
          usage,
        });
      }

      const { error } = await supabase
        .from("shuttle_routes")
        .delete()
        .eq("id", id);

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        deleted: id,
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
