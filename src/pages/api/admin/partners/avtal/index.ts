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

function buildInsertData(body: any) {
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
  try {
    const supabase = getSupabase();

    if (req.method === "POST") {
      const insertData = buildInsertData(req.body || {});

      if (!insertData.partner_id) {
        return res.status(400).json({
          ok: false,
          error: "Partner/operatör saknas.",
        });
      }

      if (!insertData.title) {
        return res.status(400).json({
          ok: false,
          error: "Titel på dokument/avtal saknas.",
        });
      }

      const { data, error } = await supabase
        .from("app_partner_documents")
        .insert(insertData)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        document: data,
      });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const q = String(req.query.q || "").trim().toLowerCase();
    const partnerId = String(req.query.partner_id || "").trim();
    const status = String(req.query.status || "").trim();
    const documentType = String(req.query.document_type || "").trim();

    const { data: partnersData, error: partnersError } = await supabase
      .from("app_partners")
      .select("*")
      .order("name", { ascending: true });

    if (partnersError) throw partnersError;

    let documentQuery = supabase
      .from("app_partner_documents")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(500);

    if (partnerId) documentQuery = documentQuery.eq("partner_id", partnerId);
    if (status) documentQuery = documentQuery.eq("status", status);
    if (documentType) documentQuery = documentQuery.eq("document_type", documentType);

    const { data: documentsData, error: documentsError } = await documentQuery;

    if (documentsError) {
      if (isMissingTableError(documentsError)) {
        return res.status(200).json({
          ok: true,
          needsSetup: true,
          partners: partnersData || [],
          documents: [],
          summary: {
            total: 0,
            active: 0,
            expired: 0,
            agreements: 0,
          },
        });
      }

      throw documentsError;
    }

    const partners = partnersData || [];
    let documents = documentsData || [];

    if (q) {
      documents = documents.filter((row: any) => {
        const partner = partners.find((item: any) => item.id === row.partner_id);

        const haystack = [
          row.title,
          row.document_type,
          row.status,
          row.due_date,
          row.file_url,
          row.notes,
          partner?.name,
          partner?.contact_person,
          partner?.city,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const summary = {
      total: documents.length,
      active: documents.filter((r: any) => r.status === "active").length,
      expired: documents.filter((r: any) => {
        if (!r.due_date) return false;
        const d = new Date(r.due_date);
        d.setHours(0, 0, 0, 0);
        return d < today;
      }).length,
      agreements: documents.filter((r: any) => r.document_type === "agreement").length,
    };

    return res.status(200).json({
      ok: true,
      needsSetup: false,
      partners,
      documents,
      summary,
    });
  } catch (error: any) {
    console.error("/api/admin/partners/avtal error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera avtal och dokument.",
    });
  }
}
