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

function cleanNumber(value: any, fallback = 0) {
  if (value === "" || value === null || value === undefined) return fallback;
  const normalized = String(value).replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : fallback;
}

function cleanInt(value: any, fallback = 0) {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

function isMissingTableError(error: any) {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();

  return (
    code === "42p01" ||
    code === "pgrst205" ||
    message.includes("does not exist") ||
    message.includes("could not find") ||
    message.includes("schema cache")
  );
}

function defaults() {
  return {
    settings_key: "default",
    company_name: "Helsingbuss",
    legal_name: "",
    org_number: "",
    vat_number: "",
    default_currency: "SEK",
    default_payment_terms_days: 10,
    invoice_payment_text: "",
    reminder_fee: 60,
    late_interest_percent: 8,
    vat_period: "quarterly",
    standard_vat_percent: 25,
    tax_account: "",
    accounting_bank_account: "1930",
    accounting_customer_receivables_account: "1510",
    accounting_supplier_payables_account: "2440",
    accounting_vat_output_account_25: "2611",
    accounting_vat_output_account_12: "2621",
    accounting_vat_output_account_6: "2631",
    accounting_vat_input_account: "2641",
    accounting_vat_report_account: "2650",
    accounting_tax_account: "1630",
    notes: "",
  };
}

function buildPayload(body: any) {
  return {
    settings_key: "default",
    company_name: cleanText(body.company_name) || "Helsingbuss",
    legal_name: cleanText(body.legal_name),
    org_number: cleanText(body.org_number),
    vat_number: cleanText(body.vat_number),

    default_currency: cleanText(body.default_currency) || "SEK",
    default_payment_terms_days: cleanInt(body.default_payment_terms_days, 10),
    invoice_payment_text: cleanText(body.invoice_payment_text),
    reminder_fee: cleanNumber(body.reminder_fee, 60),
    late_interest_percent: cleanNumber(body.late_interest_percent, 8),

    vat_period: cleanText(body.vat_period) || "quarterly",
    standard_vat_percent: cleanNumber(body.standard_vat_percent, 25),
    tax_account: cleanText(body.tax_account),

    accounting_bank_account: cleanText(body.accounting_bank_account) || "1930",
    accounting_customer_receivables_account: cleanText(body.accounting_customer_receivables_account) || "1510",
    accounting_supplier_payables_account: cleanText(body.accounting_supplier_payables_account) || "2440",

    accounting_vat_output_account_25: cleanText(body.accounting_vat_output_account_25) || "2611",
    accounting_vat_output_account_12: cleanText(body.accounting_vat_output_account_12) || "2621",
    accounting_vat_output_account_6: cleanText(body.accounting_vat_output_account_6) || "2631",
    accounting_vat_input_account: cleanText(body.accounting_vat_input_account) || "2641",
    accounting_vat_report_account: cleanText(body.accounting_vat_report_account) || "2650",
    accounting_tax_account: cleanText(body.accounting_tax_account) || "1630",

    notes: cleanText(body.notes),
    updated_at: new Date().toISOString(),
  };
}

async function loadSettings(supabase: any) {
  const { data, error } = await supabase
    .from("company_finance_settings")
    .select("*")
    .eq("settings_key", "default")
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) {
      return {
        needsSetup: true,
        settings: null,
        defaults: defaults(),
      };
    }

    throw error;
  }

  return {
    needsSetup: false,
    settings: data || null,
    defaults: defaults(),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const result = await loadSettings(supabase);

      return res.status(200).json({
        ok: true,
        ...result,
      });
    }

    if (req.method === "PUT" || req.method === "POST") {
      const payload = buildPayload(req.body || {});

      const { data, error } = await supabase
        .from("company_finance_settings")
        .upsert(payload, {
          onConflict: "settings_key",
        })
        .select("*")
        .single();

      if (error) {
        if (isMissingTableError(error)) {
          return res.status(200).json({
            ok: false,
            needsSetup: true,
            error: "Tabellen company_finance_settings saknas. Kör SQL-koden först.",
          });
        }

        throw error;
      }

      return res.status(200).json({
        ok: true,
        settings: data,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/bank error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera bank- och betalningsinställningar.",
    });
  }
}
