import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  "";

const tableName = "system_webhooks";

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    return null;
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

function cleanMethod(value: any) {
  const method = cleanString(value || "POST").toUpperCase();
  const allowed = ["POST", "PUT", "PATCH"];

  return allowed.includes(method) ? method : "POST";
}

function cleanStatus(value: any) {
  const status = cleanString(value || "active").toLowerCase();
  const allowed = ["active", "inactive", "planned", "error"];

  return allowed.includes(status) ? status : "active";
}

function cleanEvents(value: any) {
  if (Array.isArray(value)) {
    return value.map((item) => cleanString(item)).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeWebhook(row: any) {
  return {
    id: row.id,
    name: row.name || "",
    endpoint_url: row.endpoint_url || "",
    method: row.method || "POST",
    event_types: Array.isArray(row.event_types) ? row.event_types : [],
    status: row.status || "active",
    secret_header_name: row.secret_header_name || "",
    masked_secret: row.masked_secret || "",
    note: row.note || "",
    last_test_status: row.last_test_status || "",
    last_test_message: row.last_test_message || "",
    last_test_at: row.last_test_at || "",
    updated_at: row.updated_at || "",
    created_at: row.created_at || "",
  };
}

function cleanPayload(input: any) {
  return {
    name: cleanString(input.name),
    endpoint_url: cleanString(input.endpoint_url),
    method: cleanMethod(input.method),
    event_types: cleanEvents(input.event_types),
    status: cleanStatus(input.status),
    secret_header_name: cleanString(input.secret_header_name),
    masked_secret: cleanString(input.masked_secret),
    note: cleanString(input.note),
    updated_at: new Date().toISOString(),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (!supabase) {
      return res.status(500).json({
        ok: false,
        error: "Supabase env saknas.",
      });
    }

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        return res.status(200).json({
          ok: true,
          webhooks: [],
          warnings: [
            "Tabellen system_webhooks finns kanske inte ännu. Kör SQL-koden för att kunna spara webhookar."
          ],
          summary: {
            total: 0,
            active: 0,
            inactive: 0,
            planned: 0,
            error: 0,
          },
        });
      }

      const webhooks = (data || []).map(normalizeWebhook);

      return res.status(200).json({
        ok: true,
        webhooks,
        warnings: [],
        summary: {
          total: webhooks.length,
          active: webhooks.filter((item) => item.status === "active").length,
          inactive: webhooks.filter((item) => item.status === "inactive").length,
          planned: webhooks.filter((item) => item.status === "planned").length,
          error: webhooks.filter((item) => item.status === "error").length,
        },
      });
    }

    if (req.method === "POST") {
      const payload = cleanPayload(req.body || {});

      if (!payload.name) {
        return res.status(400).json({
          ok: false,
          error: "Namn saknas.",
        });
      }

      if (!payload.endpoint_url || !/^https?:\/\//i.test(payload.endpoint_url)) {
        return res.status(400).json({
          ok: false,
          error: "Webhook URL måste börja med http:// eller https://.",
        });
      }

      const id = cleanString(req.body?.id);

      let query;

      if (id) {
        query = supabase
          .from(tableName)
          .update(payload)
          .eq("id", id)
          .select("*")
          .single();
      } else {
        query = supabase
          .from(tableName)
          .insert(payload)
          .select("*")
          .single();
      }

      const { data, error } = await query;

      if (error) {
        return res.status(500).json({
          ok: false,
          error: "Kunde inte spara webhook. Kör SQL-koden för system_webhooks om tabellen saknas. " + error.message,
        });
      }

      return res.status(200).json({
        ok: true,
        webhook: normalizeWebhook(data),
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Metoden stöds inte.",
    });
  } catch (error: any) {
    console.error("/api/admin/system/webhookar error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera webhookar.",
    });
  }
}
