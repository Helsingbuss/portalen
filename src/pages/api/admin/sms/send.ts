import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdminApi } from "@/lib/adminApi";

function normalizeSwedishPhone(input: string) {
  const cleaned = String(input || "")
    .trim()
    .replace(/\s/g, "")
    .replace(/-/g, "");

  if (!cleaned) return "";

  if (cleaned.startsWith("+")) return cleaned;

  if (cleaned.startsWith("00")) {
    return "+" + cleaned.slice(2);
  }

  if (cleaned.startsWith("46")) {
    return "+" + cleaned;
  }

  if (cleaned.startsWith("0")) {
    return "+46" + cleaned.slice(1);
  }

  return cleaned;
}

function isDryRun() {
  return String(process.env.ELKS_DRYRUN || "").toLowerCase() === "true";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const auth = await requireAdminApi(req, res);
  if (!auth) return;

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Metoden stöds inte." });
    return;
  }

  const { supabaseAdmin, user } = auth;

  const username = process.env.ELKS_USERNAME;
  const password = process.env.ELKS_PASSWORD;
  const from = process.env.ELKS_FROM || "Helsingbuss";

  if (!username || !password) {
    res.status(500).json({
      ok: false,
      error: "ELKS_USERNAME eller ELKS_PASSWORD saknas i portalens .env.local.",
    });
    return;
  }

  const {
    to,
    message,
    customerName,
    sourceType,
    sourceId,
  } = req.body || {};

  const normalizedTo = normalizeSwedishPhone(to);

  if (!normalizedTo || !normalizedTo.startsWith("+")) {
    res.status(400).json({
      ok: false,
      error: "Telefonnummer måste vara i korrekt format, t.ex. +46701234567.",
    });
    return;
  }

  if (!message || String(message).trim().length < 2) {
    res.status(400).json({
      ok: false,
      error: "SMS-meddelande saknas.",
    });
    return;
  }

  const smsMessage = String(message).trim();

  const { data: logRow, error: logError } = await supabaseAdmin
    .from("app_sms_logs")
    .insert({
      to_phone: normalizedTo,
      from_name: from,
      message: smsMessage,
      customer_name: customerName || null,
      source_type: sourceType || null,
      source_id: sourceId || null,
      status: isDryRun() ? "dryrun_pending" : "pending",
      created_by: user.id,
    })
    .select("*")
    .single();

  if (logError) {
    res.status(500).json({
      ok: false,
      error: logError.message,
    });
    return;
  }

  const body = new URLSearchParams({
    from,
    to: normalizedTo,
    message: smsMessage,
  });

  if (isDryRun()) {
    body.set("dryrun", "yes");
  }

  const basicAuth = Buffer.from(`${username}:${password}`).toString("base64");

  try {
    const response = await fetch("https://api.46elks.com/a1/sms", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const text = await response.text();

    let payload: any = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { raw: text };
    }

    if (!response.ok) {
      await supabaseAdmin
        .from("app_sms_logs")
        .update({
          status: "failed",
          provider_status: payload?.status || "failed",
          provider_raw: payload,
          error_message:
            payload?.message ||
            payload?.error ||
            payload?.detail ||
            "46elks kunde inte skicka SMS.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", logRow.id);

      res.status(response.status).json({
        ok: false,
        error:
          payload?.message ||
          payload?.error ||
          payload?.detail ||
          "46elks kunde inte skicka SMS.",
        provider: payload,
      });
      return;
    }

    await supabaseAdmin
      .from("app_sms_logs")
      .update({
        status: isDryRun() ? "dryrun" : "sent",
        provider_message_id: payload?.id || null,
        provider_status: payload?.status || null,
        provider_raw: payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", logRow.id);

    res.status(200).json({
      ok: true,
      dryrun: isDryRun(),
      smsLogId: logRow.id,
      providerMessageId: payload?.id || null,
      providerStatus: payload?.status || null,
      parts: payload?.parts || null,
      estimatedCost: payload?.estimated_cost || null,
      to: normalizedTo,
      from,
    });
  } catch (error: any) {
    await supabaseAdmin
      .from("app_sms_logs")
      .update({
        status: "failed",
        error_message: error?.message || "Kunde inte kontakta 46elks.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", logRow.id);

    res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte kontakta 46elks.",
    });
  }
}
