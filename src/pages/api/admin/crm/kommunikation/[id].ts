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

function cleanDateTime(value: any) {
  const text = cleanText(value);
  return text || null;
}

function buildUpdateData(body: any) {
  return {
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
  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({ ok: false, error: "Kommunikations-ID saknas." });
  }

  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("crm_kommunikation")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        communication: data,
      });
    }

    if (req.method === "PUT") {
      const updateData = buildUpdateData(req.body || {});

      const { data, error } = await supabase
        .from("crm_kommunikation")
        .update(updateData)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        communication: data,
      });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (error: any) {
    console.error("/api/admin/crm/kommunikation/[id] error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera kommunikationsposten.",
    });
  }
}
