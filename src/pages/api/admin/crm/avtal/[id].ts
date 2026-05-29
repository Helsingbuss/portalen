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

function cleanNumber(value: any) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function cleanDate(value: any) {
  const text = cleanText(value);
  return text || null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({ ok: false, error: "Avtals-ID saknas." });
  }

  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("crm_avtal")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        agreement: data,
      });
    }

    if (req.method === "PUT") {
      const body = req.body || {};

      const updateData = {
        title: cleanText(body.title),
        customer_name: cleanText(body.customer_name),
        company_name: cleanText(body.company_name),
        org_number: cleanText(body.org_number),
        contact_person: cleanText(body.contact_person),
        email: cleanText(body.email),
        phone: cleanText(body.phone),
        agreement_type: cleanText(body.agreement_type) || "company",
        status: cleanText(body.status) || "draft",
        discount_percent: cleanNumber(body.discount_percent),
        fixed_price: cleanNumber(body.fixed_price),
        currency: cleanText(body.currency) || "SEK",
        valid_from: cleanDate(body.valid_from),
        valid_until: cleanDate(body.valid_until),
        notes: cleanText(body.notes),
        terms: cleanText(body.terms),
      };

      const { data, error } = await supabase
        .from("crm_avtal")
        .update(updateData)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        agreement: data,
      });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (error: any) {
    console.error("/api/admin/crm/avtal/[id] error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera avtalet.",
    });
  }
}
