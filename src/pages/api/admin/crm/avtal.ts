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

function cleanNumber(value: any) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function cleanInteger(value: any) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function cleanDate(value: any) {
  return cleanText(value);
}

function buildInsertData(body: any) {
  return {
    title: cleanText(body.title),
    customer_name: cleanText(body.customer_name),
    company_name: cleanText(body.company_name),
    org_number: cleanText(body.org_number),
    contact_person: cleanText(body.contact_person),
    email: cleanText(body.email),
    phone: cleanText(body.phone),

    agreement_type: cleanText(body.agreement_type) || "framework",
    status: cleanText(body.status) || "draft",
    agreement_date: cleanDate(body.agreement_date),
    valid_from: cleanDate(body.valid_from),
    valid_until: cleanDate(body.valid_until),

    hb_company_name: cleanText(body.hb_company_name) || "Helsingbuss AB",
    hb_org_number: cleanText(body.hb_org_number),
    hb_address: cleanText(body.hb_address) || "Järnvägsgatan 19, 252 24 Helsingborg",
    hb_contact_person: cleanText(body.hb_contact_person) || "Andreas Ekelöf",
    hb_email: cleanText(body.hb_email) || "info@helsingbuss.se",
    hb_phone: cleanText(body.hb_phone) || "042-12 33 00",

    customer_address: cleanText(body.customer_address),
    customer_person_number: cleanText(body.customer_person_number),

    service_task: cleanText(body.service_task),
    agreed_service: cleanText(body.agreed_service),
    geographical_area: cleanText(body.geographical_area),
    estimated_volume: cleanText(body.estimated_volume),
    special_requests: cleanText(body.special_requests),

    min_commitment_months: cleanInteger(body.min_commitment_months),
    notice_months: cleanInteger(body.notice_months),
    extension_months: cleanInteger(body.extension_months),

    discount_percent: cleanNumber(body.discount_percent),
    fixed_price: cleanNumber(body.fixed_price),
    currency: cleanText(body.currency) || "SEK",
    invoicing_interval: cleanText(body.invoicing_interval),
    payment_terms: cleanText(body.payment_terms),
    payment_other: cleanText(body.payment_other),

    cancellation_terms: cleanText(body.cancellation_terms),
    hb_responsibility: cleanText(body.hb_responsibility),
    customer_responsibility: cleanText(body.customer_responsibility),
    force_majeure_terms: cleanText(body.force_majeure_terms),
    gdpr_terms: cleanText(body.gdpr_terms),
    change_terms: cleanText(body.change_terms),
    extra_terms: cleanText(body.extra_terms),

    notes: cleanText(body.notes),
    terms: cleanText(body.terms),

    hb_sign_place_date: cleanText(body.hb_sign_place_date),
    hb_sign_name: cleanText(body.hb_sign_name),
    hb_sign_title: cleanText(body.hb_sign_title),
    customer_sign_place_date: cleanText(body.customer_sign_place_date),
    customer_sign_name: cleanText(body.customer_sign_name),
    customer_sign_title: cleanText(body.customer_sign_title),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (req.method === "POST") {
      const insertData = buildInsertData(req.body || {});

      const { data, error } = await supabase
        .from("crm_avtal")
        .insert(insertData)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        agreement: data,
      });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const q = String(req.query.q || "").trim().toLowerCase();
    const status = String(req.query.status || "").trim();
    const type = String(req.query.type || "").trim();

    let query = supabase
      .from("crm_avtal")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);

    if (status) query = query.eq("status", status);
    if (type) query = query.eq("agreement_type", type);

    const { data, error } = await query;

    if (error) {
      if (isMissingTableError(error)) {
        return res.status(200).json({
          ok: true,
          needsSetup: true,
          agreements: [],
          summary: {
            total: 0,
            active: 0,
            draft: 0,
            expired: 0,
          },
        });
      }

      throw error;
    }

    let rows = data || [];

    if (q) {
      rows = rows.filter((row: any) => {
        const haystack = [
          row.customer_name,
          row.company_name,
          row.org_number,
          row.contact_person,
          row.email,
          row.phone,
          row.agreement_number,
          row.title,
          row.status,
          row.agreement_type,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      });
    }

    const summary = {
      total: rows.length,
      active: rows.filter((r: any) => r.status === "active").length,
      draft: rows.filter((r: any) => r.status === "draft").length,
      expired: rows.filter((r: any) => r.status === "expired").length,
    };

    return res.status(200).json({
      ok: true,
      needsSetup: false,
      agreements: rows,
      summary,
    });
  } catch (error: any) {
    console.error("/api/admin/crm/avtal error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera avtal.",
    });
  }
}
