import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase env saknas.");
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

function cleanBoolean(value: any, fallback = false) {
  if (value === true || value === "true" || value === "1" || value === 1) return true;
  if (value === false || value === "false" || value === "0" || value === 0) return false;
  return fallback;
}

function cleanInt(value: any, fallback = 0) {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

function buildAccount(body: any) {
  return {
    account_label: cleanText(body.account_label) || "Bankkonto",
    account_purpose: cleanText(body.account_purpose) || "other",
    account_type: cleanText(body.account_type) || "business_account",
    bank_name: cleanText(body.bank_name) || "Swedbank",
    clearing_number: cleanText(body.clearing_number),
    account_number: cleanText(body.account_number),
    bankgiro: cleanText(body.bankgiro),
    plusgiro: cleanText(body.plusgiro),
    iban: cleanText(body.iban),
    bic: cleanText(body.bic) || "SWEDSESS",
    is_primary_for_invoices: cleanBoolean(body.is_primary_for_invoices, false),
    is_primary_for_payroll: cleanBoolean(body.is_primary_for_payroll, false),
    is_active: cleanBoolean(body.is_active, true),
    display_order: cleanInt(body.display_order, 100),
    notes: cleanText(body.notes),
    updated_at: new Date().toISOString(),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({
      ok: false,
      error: "Bankkonto-ID saknas.",
    });
  }

  try {
    const supabase = getSupabase();

    if (req.method === "PUT") {
      const payload = buildAccount(req.body || {});

      const { data, error } = await supabase
        .from("company_bank_accounts")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        account: data,
      });
    }

    if (req.method === "DELETE") {
      const { data, error } = await supabase
        .from("company_bank_accounts")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        account: data,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/bank/accounts/[id] error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera bankkonto.",
    });
  }
}
