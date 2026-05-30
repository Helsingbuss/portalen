import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase env saknas. CRM admin kräver SUPABASE_SERVICE_ROLE_KEY eller SUPABASE_SERVICE_KEY i .env.local."
    );
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function isMissingTableError(error: any) {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();

  return (
    code === "42p01" ||
    code === "pgrst205" ||
    message.includes("does not exist") ||
    message.includes("could not find the table") ||
    (message.includes("relation") && message.includes("does not exist"))
  );
}

function cleanText(value: any) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function cleanTags(value: any) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanUuid(value: any) {
  const text = cleanText(value);
  return text || null;
}

function cleanDateTime(value: any) {
  const text = cleanText(value);
  return text || null;
}

function buildInsertData(body: any) {
  return {
    contact_id: cleanUuid(body.contact_id),
    agreement_id: cleanUuid(body.agreement_id),

    related_booking_number: cleanText(body.related_booking_number),
    related_ticket_number: cleanText(body.related_ticket_number),

    channel: cleanText(body.channel) || "note",
    direction: cleanText(body.direction) || "internal",
    status: cleanText(body.status) || "done",

    subject: cleanText(body.subject),
    message: cleanText(body.message),

    contact_name: cleanText(body.contact_name),
    contact_email: cleanText(body.contact_email),
    contact_phone: cleanText(body.contact_phone),

    handled_by: cleanText(body.handled_by),
    scheduled_at: cleanDateTime(body.scheduled_at),
    sent_at: cleanDateTime(body.sent_at),
    completed_at: cleanDateTime(body.completed_at),

    priority: cleanText(body.priority) || "normal",
    tags: cleanTags(body.tags),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (req.method === "POST") {
      const insertData = buildInsertData(req.body || {});

      const { data, error } = await supabase
        .from("crm_kommunikation")
        .insert(insertData)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        communication: data,
      });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const q = String(req.query.q || "").trim().toLowerCase();
    const channel = String(req.query.channel || "").trim();
    const status = String(req.query.status || "").trim();

    let query = supabase
      .from("crm_kommunikation")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (channel) query = query.eq("channel", channel);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;

    if (error) {
      if (isMissingTableError(error)) {
        return res.status(200).json({
          ok: true,
          needsSetup: true,
          communications: [],
          summary: {
            total: 0,
            mail: 0,
            sms: 0,
            notes: 0,
            pending: 0,
          },
        });
      }

      throw error;
    }

    let rows = data || [];

    if (q) {
      rows = rows.filter((row: any) => {
        const haystack = [
          row.communication_number,
          row.subject,
          row.message,
          row.contact_name,
          row.contact_email,
          row.contact_phone,
          row.related_booking_number,
          row.related_ticket_number,
          row.channel,
          row.status,
          row.direction,
          row.handled_by,
          Array.isArray(row.tags) ? row.tags.join(" ") : "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      });
    }

    const summary = {
      total: rows.length,
      mail: rows.filter((r: any) => r.channel === "email").length,
      sms: rows.filter((r: any) => r.channel === "sms").length,
      notes: rows.filter((r: any) => r.channel === "note").length,
      pending: rows.filter((r: any) =>
        ["draft", "scheduled", "pending"].includes(String(r.status || ""))
      ).length,
    };

    return res.status(200).json({
      ok: true,
      needsSetup: false,
      communications: rows,
      summary,
    });
  } catch (error: any) {
    console.error("/api/admin/crm/kommunikation error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera kommunikation.",
    });
  }
}
