import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { requirePayrollAccess } from "@/lib/payrollAccess";

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

const DEFAULT_SETTINGS = {
  rule_year: 2026,

  employer_fee_standard_percent: 31.42,
  employer_fee_pensioner_percent: 10.21,
  employer_fee_youth_percent: 20.81,
  youth_monthly_limit: 25000,

  tax_deduction_mode: "table_or_decision",
  side_income_tax_percent: 30,
  min_annual_payment_for_tax: 1000,

  vacation_pay_percent_default: 12,
  standard_hours_per_month: 174,

  domestic_per_diem_full_day: 300,
  domestic_per_diem_half_day: 150,
  domestic_per_diem_after_three_months: 210,
  domestic_per_diem_after_two_years: 150,
  domestic_per_diem_night: 150,

  pay_period_start_day: 1,
  pay_period_end_day: 31,
  payout_day: 25,

  swedbank_export_enabled: false,
  swedbank_export_format: "iso20022_pain001",
  bank_export_requires_manual_approval: true,

  is_active: true,
  notes:
    "Standardinställningar för svensk lön 2026. Kontrollera alltid mot revisor, kollektivavtal och aktuella regler innan lönekörning.",
};

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

function cleanNumber(value: any, fallback: number | null = null) {
  if (value === "" || value === null || value === undefined) return fallback;
  const normalized = String(value).replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : fallback;
}

function cleanInteger(value: any, fallback: number | null = null) {
  const n = cleanNumber(value, fallback);
  return n === null ? null : Math.round(n);
}

function cleanBoolean(value: any, fallback = false) {
  if (value === true || value === "true" || value === "1" || value === 1) return true;
  if (value === false || value === "false" || value === "0" || value === 0) return false;
  return fallback;
}

function buildSettingsData(body: any) {
  return {
    rule_year: cleanInteger(body.rule_year, DEFAULT_SETTINGS.rule_year),

    employer_fee_standard_percent: cleanNumber(
      body.employer_fee_standard_percent,
      DEFAULT_SETTINGS.employer_fee_standard_percent
    ),
    employer_fee_pensioner_percent: cleanNumber(
      body.employer_fee_pensioner_percent,
      DEFAULT_SETTINGS.employer_fee_pensioner_percent
    ),
    employer_fee_youth_percent: cleanNumber(
      body.employer_fee_youth_percent,
      DEFAULT_SETTINGS.employer_fee_youth_percent
    ),
    youth_monthly_limit: cleanNumber(
      body.youth_monthly_limit,
      DEFAULT_SETTINGS.youth_monthly_limit
    ),

    tax_deduction_mode:
      cleanText(body.tax_deduction_mode) || DEFAULT_SETTINGS.tax_deduction_mode,
    side_income_tax_percent: cleanNumber(
      body.side_income_tax_percent,
      DEFAULT_SETTINGS.side_income_tax_percent
    ),
    min_annual_payment_for_tax: cleanNumber(
      body.min_annual_payment_for_tax,
      DEFAULT_SETTINGS.min_annual_payment_for_tax
    ),

    vacation_pay_percent_default: cleanNumber(
      body.vacation_pay_percent_default,
      DEFAULT_SETTINGS.vacation_pay_percent_default
    ),
    standard_hours_per_month: cleanNumber(
      body.standard_hours_per_month,
      DEFAULT_SETTINGS.standard_hours_per_month
    ),

    domestic_per_diem_full_day: cleanNumber(
      body.domestic_per_diem_full_day,
      DEFAULT_SETTINGS.domestic_per_diem_full_day
    ),
    domestic_per_diem_half_day: cleanNumber(
      body.domestic_per_diem_half_day,
      DEFAULT_SETTINGS.domestic_per_diem_half_day
    ),
    domestic_per_diem_after_three_months: cleanNumber(
      body.domestic_per_diem_after_three_months,
      DEFAULT_SETTINGS.domestic_per_diem_after_three_months
    ),
    domestic_per_diem_after_two_years: cleanNumber(
      body.domestic_per_diem_after_two_years,
      DEFAULT_SETTINGS.domestic_per_diem_after_two_years
    ),
    domestic_per_diem_night: cleanNumber(
      body.domestic_per_diem_night,
      DEFAULT_SETTINGS.domestic_per_diem_night
    ),

    pay_period_start_day: cleanInteger(
      body.pay_period_start_day,
      DEFAULT_SETTINGS.pay_period_start_day
    ),
    pay_period_end_day: cleanInteger(
      body.pay_period_end_day,
      DEFAULT_SETTINGS.pay_period_end_day
    ),
    payout_day: cleanInteger(body.payout_day, DEFAULT_SETTINGS.payout_day),

    swedbank_export_enabled: cleanBoolean(
      body.swedbank_export_enabled,
      DEFAULT_SETTINGS.swedbank_export_enabled
    ),
    swedbank_export_format:
      cleanText(body.swedbank_export_format) ||
      DEFAULT_SETTINGS.swedbank_export_format,
    bank_export_requires_manual_approval: cleanBoolean(
      body.bank_export_requires_manual_approval,
      DEFAULT_SETTINGS.bank_export_requires_manual_approval
    ),

    is_active: cleanBoolean(body.is_active, true),
    notes: cleanText(body.notes),
    updated_at: new Date().toISOString(),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requirePayrollAccess(req, res)) return;

  try {
    const supabase = getSupabase();

    if (req.method === "POST") {
      const settings = buildSettingsData(req.body || {});

      if (!settings.rule_year) {
        return res.status(400).json({
          ok: false,
          error: "Löneår saknas.",
        });
      }

      const { data, error } = await supabase
        .from("payroll_rule_settings")
        .upsert(settings, { onConflict: "rule_year" })
        .select("*")
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        settings: data,
      });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const year = String(req.query.year || "").trim();

    let query = supabase
      .from("payroll_rule_settings")
      .select("*")
      .order("rule_year", { ascending: false })
      .limit(1);

    if (year) {
      query = supabase
        .from("payroll_rule_settings")
        .select("*")
        .eq("rule_year", Number(year))
        .limit(1);
    }

    const { data, error } = await query;

    if (error) {
      if (isMissingTableError(error)) {
        return res.status(200).json({
          ok: true,
          needsSetup: true,
          settings: null,
          defaults: DEFAULT_SETTINGS,
        });
      }

      throw error;
    }

    return res.status(200).json({
      ok: true,
      needsSetup: false,
      settings: data?.[0] || null,
      defaults: DEFAULT_SETTINGS,
    });
  } catch (error: any) {
    console.error("/api/admin/lon/regler error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera skatter och regler.",
    });
  }
}
