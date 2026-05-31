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
    document_type: cleanText(body.document_type) || "agreement",
    status: cleanText(body.status) || "active",
    due_date: cleanText(body.due_date),
    file_url: cleanText(body.file_url),
    notes: cleanText(body.notes),
    updated_at: new Date().toISOString(),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({ ok: false, error: "Dokument-ID saknas." });
  }

  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const { data: document, error: documentError } = await supabase
        .from("app_partner_documents")
        .select("*")
        .eq("id", id)
        .single();

      if (documentError) throw documentError;

      const { data: partners, error: partnersError } = await supabase
        .from("app_partners")
        .select("*")
        .order("name", { ascending: true });

      if (partnersError) throw partnersError;

      return res.status(200).json({
        ok: true,
        document,
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
          error: "Titel saknas.",
        });
      }

      const { data, error } = await supabase
        .from("app_partner_documents")
        .update(updateData)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        document: data,
      });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (error: any) {
    console.error("/api/admin/partners/avtal/[id] error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera dokumentet.",
    });
  }
}
