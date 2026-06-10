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

  const num = Number(String(value).replace(",", "."));

  return Number.isFinite(num) ? num : fallback;
}

function cleanInt(value: any, fallback = 0) {
  const num = Number.parseInt(String(value ?? ""), 10);

  return Number.isFinite(num) ? num : fallback;
}

const defaultSettings = {
  settings_key: "default",
  invoice_payment_text:
    "Betalning sker till angivet bankgiro eller via Swish. Ange alltid fakturans OCR vid betalning.",
  default_payment_terms_days: 10,
  reminder_fee_amount: 60,
  late_interest_percent: 10,
  reminder_payment_days: 7,
  default_sales_account: "3010",
  default_output_vat_account: "2631",
  default_cost_account: "4010",
  default_input_vat_account: "2641",
};

async function ensureSettings(supabase: any) {
  const { data, error } = await supabase
    .from("company_finance_settings")
    .select("*")
    .eq("settings_key", "default")
    .maybeSingle();

  if (error) throw error;

  if (data) {
    return {
      ...defaultSettings,
      ...data,
    };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("company_finance_settings")
    .insert(defaultSettings)
    .select("*")
    .single();

  if (insertError) throw insertError;

  return {
    ...defaultSettings,
    ...inserted,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const settings = await ensureSettings(supabase);

      return res.status(200).json({
        ok: true,
        settings,
      });
    }

    if (req.method === "PUT") {
      const body = req.body || {};

      const payload = {
        settings_key: "default",

        invoice_payment_text:
          cleanText(body.invoice_payment_text) ||
          defaultSettings.invoice_payment_text,

        default_payment_terms_days: cleanInt(
          body.default_payment_terms_days,
          defaultSettings.default_payment_terms_days
        ),

        reminder_fee_amount: cleanNumber(
          body.reminder_fee_amount,
          defaultSettings.reminder_fee_amount
        ),

        late_interest_percent: cleanNumber(
          body.late_interest_percent,
          defaultSettings.late_interest_percent
        ),

        reminder_payment_days: cleanInt(
          body.reminder_payment_days,
          defaultSettings.reminder_payment_days
        ),

        default_sales_account:
          cleanText(body.default_sales_account) ||
          defaultSettings.default_sales_account,

        default_output_vat_account:
          cleanText(body.default_output_vat_account) ||
          defaultSettings.default_output_vat_account,

        default_cost_account:
          cleanText(body.default_cost_account) ||
          defaultSettings.default_cost_account,

        default_input_vat_account:
          cleanText(body.default_input_vat_account) ||
          defaultSettings.default_input_vat_account,

        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("company_finance_settings")
        .upsert(payload, {
          onConflict: "settings_key",
        })
        .select("*")
        .single();

      if (error) throw error;

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
    console.error("/api/admin/ekonomi/installningar error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera ekonomiinställningar.",
    });
  }
}
