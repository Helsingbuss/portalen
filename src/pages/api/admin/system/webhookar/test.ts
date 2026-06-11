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

async function testWebhook(url: string, method: string, name: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      method: method || "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Helsingbuss-Portal-Webhook-Test",
      },
      body: JSON.stringify({
        event: "system.webhook_test",
        source: "Helsingbuss Portal",
        webhook_name: name,
        sent_at: new Date().toISOString(),
        message: "Detta är ett test från Helsingbuss portalen.",
      }),
      signal: controller.signal,
    });

    const text = await response.text().catch(() => "");

    return {
      success: response.ok,
      status: String(response.status),
      message: response.ok
        ? "Test skickat. Mottagaren svarade " + response.status + "."
        : "Mottagaren svarade " + response.status + ". " + text.slice(0, 200),
    };
  } catch (error: any) {
    return {
      success: false,
      status: "error",
      message: error?.name === "AbortError"
        ? "Testet avbröts eftersom mottagaren inte svarade inom 10 sekunder."
        : error?.message || "Kunde inte skicka test.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: "Metoden stöds inte.",
      });
    }

    const supabase = getSupabase();

    if (!supabase) {
      return res.status(500).json({
        ok: false,
        error: "Supabase env saknas.",
      });
    }

    const id = cleanString(req.body?.id);

    if (!id) {
      return res.status(400).json({
        ok: false,
        error: "Webhook-id saknas.",
      });
    }

    const { data: webhook, error } = await supabase
      .from(tableName)
      .select("*")
      .eq("id", id)
      .single();

    if (error || !webhook) {
      return res.status(404).json({
        ok: false,
        error: "Webhook hittades inte.",
      });
    }

    if (!webhook.endpoint_url || !/^https?:\/\//i.test(webhook.endpoint_url)) {
      return res.status(400).json({
        ok: false,
        error: "Webhook URL är ogiltig.",
      });
    }

    const result = await testWebhook(webhook.endpoint_url, webhook.method || "POST", webhook.name || "Webhook");

    await supabase
      .from(tableName)
      .update({
        last_test_status: result.success ? "success" : "error",
        last_test_message: result.message,
        last_test_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    return res.status(200).json({
      ok: true,
      result,
    });
  } catch (error: any) {
    console.error("/api/admin/system/webhookar/test error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte testa webhook.",
    });
  }
}
