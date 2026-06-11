import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

const tableName = "system_event_logs";

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase env saknas.");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function cleanString(value: any) {
  return String(value || "").trim();
}

function cleanLevel(value: any) {
  const level = cleanString(value || "info").toLowerCase();
  const allowed = ["info", "success", "warning", "error"];

  return allowed.includes(level) ? level : "info";
}

function normalizeLog(row: any) {
  return {
    id: row.id,
    level: row.level || "info",
    module: row.module || "System",
    action: row.action || "Händelse",
    message: row.message || "",
    actor_email: row.actor_email || "",
    actor_name: row.actor_name || "",
    metadata: row.metadata || {},
    created_at: row.created_at || "",
  };
}

function summaryFromLogs(logs: any[]) {
  return {
    total: logs.length,
    info: logs.filter((log) => log.level === "info").length,
    success: logs.filter((log) => log.level === "success").length,
    warning: logs.filter((log) => log.level === "warning").length,
    error: logs.filter((log) => log.level === "error").length,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) {
        return res.status(200).json({
          ok: true,
          logs: [],
          summary: {
            total: 0,
            info: 0,
            success: 0,
            warning: 0,
            error: 0,
          },
          warnings: [
            "Tabellen system_event_logs finns kanske inte ännu. Kör SQL-koden för att kunna spara och visa loggar."
          ],
        });
      }

      const logs = (data || []).map(normalizeLog);

      return res.status(200).json({
        ok: true,
        logs,
        summary: summaryFromLogs(logs),
        warnings: [],
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};

      const payload = {
        level: cleanLevel(body.level),
        module: cleanString(body.module) || "System",
        action: cleanString(body.action) || "Manuell händelse",
        message: cleanString(body.message),
        actor_email: cleanString(body.actor_email),
        actor_name: cleanString(body.actor_name),
        metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {},
      };

      if (!payload.message) {
        return res.status(400).json({
          ok: false,
          error: "Meddelande saknas.",
        });
      }

      const { data, error } = await supabase
        .from(tableName)
        .insert(payload)
        .select("*")
        .single();

      if (error) {
        return res.status(500).json({
          ok: false,
          error: "Kunde inte spara loggen. Kör SQL-koden för system_event_logs om tabellen saknas. " + error.message,
        });
      }

      return res.status(200).json({
        ok: true,
        log: normalizeLog(data),
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Metoden stöds inte.",
    });
  } catch (error: any) {
    console.error("/api/admin/system/loggar-handelser error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera loggar och händelser.",
    });
  }
}
