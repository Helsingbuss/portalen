import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

function numberOrNull(value: any) {
  if (value === "" || value === null || value === undefined) return null;

  const n = Number(String(value).replace(",", "."));

  return Number.isFinite(n) ? n : null;
}

function numberOrZero(value: any) {
  if (value === "" || value === null || value === undefined) return 0;

  const n = Number(String(value).replace(",", "."));

  return Number.isFinite(n) ? n : 0;
}

function boolValue(value: any, fallback = true) {
  if (value === true || value === "true" || value === "1") return true;
  if (value === false || value === "false" || value === "0") return false;

  return fallback;
}

function stopPayload(body: any) {
  return {
    name: String(body.name || "").trim(),
    city: body.city || null,
    address: body.address || null,
    stop_code: body.stop_code || null,

    latitude: numberOrNull(body.latitude),
    longitude: numberOrNull(body.longitude),

    description: body.description || null,
    sort_order: numberOrZero(body.sort_order),

    status: body.status || "active",
    is_active: boolValue(body.is_active, true),

    updated_at: new Date().toISOString(),
  };
}

async function countStopUsage(stopId: string) {
  const { count: lineStopCount, error: lineStopError } = await supabase
    .from("shuttle_line_stops")
    .select("id", { count: "exact", head: true })
    .eq("stop_id", stopId);

  if (lineStopError) throw lineStopError;

  const { count: departureStopCount, error: departureStopError } = await supabase
    .from("shuttle_departure_stops")
    .select("id", { count: "exact", head: true })
    .eq("stop_id", stopId);

  if (departureStopError) throw departureStopError;

  return {
    lineStopCount: Number(lineStopCount || 0),
    departureStopCount: Number(departureStopCount || 0),
  };
}

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
        .insert(stopPayload(body))
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        stop: data,
      });
    }

    if (req.method === "PATCH" || req.method === "PUT") {
      const body = req.body || {};
      const id = String(body.id || req.query.id || "");

      if (!id) {
        return res.status(400).json({
          ok: false,
          error: "Hållplats-ID saknas.",
        });
      }

      if (!body.name?.trim()) {
        return res.status(400).json({
          ok: false,
          error: "Hållplatsnamn saknas.",
        });
      }

      const { data, error } = await supabase
        .from("shuttle_stops")
        .update(stopPayload(body))
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        stop: data,
      });
    }

    if (req.method === "DELETE") {
      const id = String(req.query.id || req.body?.id || "");

      if (!id) {
        return res.status(400).json({
          ok: false,
          error: "Hållplats-ID saknas.",
        });
      }

      const usage = await countStopUsage(id);

      if (usage.lineStopCount > 0 || usage.departureStopCount > 0) {
        return res.status(409).json({
          ok: false,
          error:
            `Hållplatsen kan inte tas bort eftersom den används av ${usage.lineStopCount} linjekoppling/ar och ${usage.departureStopCount} avgångsstopp. ` +
            "Ta bort kopplingarna först.",
          usage,
        });
      }

      const { error } = await supabase
        .from("shuttle_stops")
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
    console.error("/api/admin/shuttle/stops error:", e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte hantera hållplatser.",
    });
  }
}