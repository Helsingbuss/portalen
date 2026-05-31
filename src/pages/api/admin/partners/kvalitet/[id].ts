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
      "Supabase env saknas. Admin kräver SUPABASE_SERVICE_ROLE_KEY eller SUPABASE_SERVICE_KEY i .env.local."
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

function buildUpdateData(body: any) {
  return {
    partner_id: cleanText(body.partner_id),
    title: cleanText(body.title),
    message: cleanText(body.message),
    note_type: cleanText(body.note_type) || "quality",
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({ ok: false, error: "Uppföljnings-ID saknas." });
  }

  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const { data: note, error: noteError } = await supabase
        .from("app_partner_notes")
        .select("*")
        .eq("id", id)
        .single();

      if (noteError) throw noteError;

      const { data: partners, error: partnersError } = await supabase
        .from("app_partners")
        .select("*")
        .order("name", { ascending: true });

      if (partnersError) throw partnersError;

      return res.status(200).json({
        ok: true,
        note,
        partners: partners || [],
      });
    }

    if (req.method === "PUT") {
      const updateData = buildUpdateData(req.body || {});

      if (!updateData.partner_id) {
        return res.status(400).json({
          ok: false,
          error: "Partner/operatör saknas.",
        });
      }

      if (!updateData.title) {
        return res.status(400).json({
          ok: false,
          error: "Rubrik saknas.",
        });
      }

      const { data, error } = await supabase
        .from("app_partner_notes")
        .update(updateData)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        note: data,
      });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (error: any) {
    console.error("/api/admin/partners/kvalitet/[id] error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera uppföljningen.",
    });
  }
}
