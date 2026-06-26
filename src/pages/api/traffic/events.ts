import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

function cleanText(value: any) {
  const text = String(value ?? "").trim();
  return text || null;
}

function cleanValue(value: any, allowed: string[], fallback: string) {
  const text = cleanText(value) || fallback;
  return allowed.includes(text) ? text : fallback;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!supabase) {
      return res.status(500).json({ ok: false, error: "Supabase-admin saknas" });
    }

    if (req.method === "GET") {
      const status = cleanText(req.query.status);
      const sourceType = cleanText(req.query.source_type);

      let query = supabase
        .from("traffic_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (status) query = query.eq("status", status);
      if (sourceType) query = query.eq("source_type", sourceType);

      const { data, error } = await query;

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        events: data || [],
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const title = cleanText(body.title);

      if (!title) {
        return res.status(400).json({
          ok: false,
          error: "Titel saknas.",
        });
      }

      const insertData = {
        event_type: cleanValue(body.event_type, ["deviation", "note", "assignment", "status", "vehicle", "driver", "system"], "note"),
        severity: cleanValue(body.severity, ["info", "warning", "critical"], "info"),
        status: cleanValue(body.status, ["open", "in_progress", "resolved", "archived"], "open"),
        source_type: cleanValue(body.source_type, ["helsingbuss", "sundra", "flygbuss", "manual"], "manual"),
        source_id: cleanText(body.source_id),
        title,
        message: cleanText(body.message),
        created_by: cleanText(body.created_by),
      };

      const { data, error } = await supabase
        .from("traffic_events")
        .insert(insertData)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        event: data,
      });
    }

    if (req.method === "PUT") {
      const body = req.body || {};
      const id = cleanText(body.id);

      if (!id) {
        return res.status(400).json({
          ok: false,
          error: "Händelse-id saknas.",
        });
      }

      const updateData: Record<string, any> = {};

      if ("title" in body) updateData.title = cleanText(body.title);
      if ("message" in body) updateData.message = cleanText(body.message);
      if ("severity" in body) updateData.severity = cleanValue(body.severity, ["info", "warning", "critical"], "info");
      if ("status" in body) {
        updateData.status = cleanValue(body.status, ["open", "in_progress", "resolved", "archived"], "open");
        if (updateData.status === "resolved" || updateData.status === "archived") {
          updateData.resolved_at = new Date().toISOString();
        }
      }

      const { data, error } = await supabase
        .from("traffic_events")
        .update(updateData)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        event: data,
      });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (e: any) {
    console.error("/api/traffic/events error:", e?.message || e);
    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte hantera trafikledningens händelser.",
    });
  }
}