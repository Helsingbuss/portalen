import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) throw new Error("Supabase env saknas.");
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isMissingTableOrColumnError(error: any) {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();
  return code === "42p01" || code === "42703" || code === "pgrst205" || code === "pgrst204" || message.includes("does not exist") || message.includes("could not find") || message.includes("schema cache");
}

function cleanText(value: any) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function cleanNumber(value: any, fallback = 0) {
  if (value === "" || value === null || value === undefined) return fallback;
  const normalized = String(value).replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : fallback;
}

function roundMoney(value: number) {
  return Number(Number(value || 0).toFixed(2));
}

async function loadRules(supabase: any) {
  const { data, error } = await supabase
    .from("payroll_rule_settings")
    .select("*")
    .order("rule_year", { ascending: false })
    .limit(1);

  if (error && !isMissingTableOrColumnError(error)) throw error;

  return data?.[0] || { side_income_tax_percent: 30, tax_deduction_mode: "manual_percent" };
}

async function loadTaxProfiles(supabase: any) {
  const { data, error } = await supabase
    .from("payroll_employee_tax_profiles")
    .select("*")
    .eq("is_active", true);

  if (error) {
    if (isMissingTableOrColumnError(error)) return [];
    throw error;
  }

  return data || [];
}

function getProfileForRow(row: any, profiles: any[]) {
  return profiles.find((profile) => profile.employee_id === row.employee_id && profile.is_active !== false) || null;
}

function calculateTax(row: any, profile: any, fallbackTaxPercent: number, fallbackTaxMode: string) {
  const grossTotal = roundMoney(Number(row.gross_total || 0));
  const extraTaxAmount = roundMoney(Number(profile?.extra_tax_amount || 0));

  let method = profile?.tax_method || fallbackTaxMode || "manual_percent";
  let percent = fallbackTaxPercent;
  let baseTaxAmount = 0;
  let profileText = "Standard/fallback";

  if (profile) {
    if (method === "side_income_30") {
      percent = 30;
      baseTaxAmount = roundMoney(grossTotal * percent / 100);
      profileText = "Sidoinkomst 30 %";
    } else if (method === "decision") {
      const fixedAmount = roundMoney(Number(profile.fixed_tax_amount || 0));
      if (fixedAmount > 0) {
        percent = 0;
        baseTaxAmount = fixedAmount;
        profileText = "Beslut/jämkning fast belopp";
      } else {
        percent = cleanNumber(profile.preliminary_tax_percent, fallbackTaxPercent);
        baseTaxAmount = roundMoney(grossTotal * percent / 100);
        profileText = "Beslut/jämkning procent";
      }
    } else if (method === "table") {
      percent = cleanNumber(profile.preliminary_tax_percent, fallbackTaxPercent);
      baseTaxAmount = roundMoney(grossTotal * percent / 100);
      profileText = "Skattetabell " + (profile.tax_table_number || "") + " kolumn " + (profile.tax_column || "") + " med preliminär procent";
    } else {
      method = "manual_percent";
      percent = cleanNumber(profile.preliminary_tax_percent, fallbackTaxPercent);
      baseTaxAmount = roundMoney(grossTotal * percent / 100);
      profileText = "Manuell procent";
    }
  } else {
    percent = fallbackTaxPercent;
    baseTaxAmount = roundMoney(grossTotal * percent / 100);
  }

  let taxAmount = roundMoney(baseTaxAmount + extraTaxAmount);
  if (taxAmount < 0) taxAmount = 0;
  if (taxAmount > grossTotal) taxAmount = grossTotal;

  const netPay = roundMoney(grossTotal - taxAmount);

  return {
    tax_deduction_mode: method,
    preliminary_tax_percent: percent,
    preliminary_tax_amount: taxAmount,
    net_pay: netPay,
    payout_amount: netPay,
    tax_profile_id: profile?.id || null,
    tax_profile_label: profileText,
    tax_table_number: profile?.tax_table_number || null,
    tax_column: profile?.tax_column || null,
    extra_tax_amount: extraTaxAmount,
  };
}

function enrichRow(row: any, profile: any, fallbackTaxPercent: number, fallbackTaxMode: string) {
  const calculated = calculateTax(row, profile, fallbackTaxPercent, fallbackTaxMode);

  return {
    ...row,
    ...calculated,
    preliminary_tax_amount: row.preliminary_tax_amount !== null && row.preliminary_tax_amount !== undefined ? Number(row.preliminary_tax_amount) : calculated.preliminary_tax_amount,
    net_pay: row.net_pay !== null && row.net_pay !== undefined ? Number(row.net_pay) : calculated.net_pay,
    payout_amount: row.payout_amount !== null && row.payout_amount !== undefined ? Number(row.payout_amount) : calculated.payout_amount,
  };
}

function buildSummary(rows: any[]) {
  return {
    rows: rows.length,
    grossTotal: roundMoney(rows.reduce((sum, row) => sum + Number(row.gross_total || 0), 0)),
    preliminaryTax: roundMoney(rows.reduce((sum, row) => sum + Number(row.preliminary_tax_amount || 0), 0)),
    netPay: roundMoney(rows.reduce((sum, row) => sum + Number(row.net_pay || 0), 0)),
    payoutAmount: roundMoney(rows.reduce((sum, row) => sum + Number(row.payout_amount || 0), 0)),
    missingNetPay: rows.filter((row) => row.net_pay === null || row.net_pay === undefined).length,
    missingTaxProfile: rows.filter((row) => !row.tax_profile_id).length,
  };
}

async function loadData(supabase: any, selectedRunId: string) {
  const { data: runsData, error: runsError } = await supabase
    .from("payroll_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (runsError) throw runsError;

  const runs = (runsData || []) as any[];
  const runId = selectedRunId || runs?.[0]?.id || "";
  const rules = await loadRules(supabase);
  const profiles = await loadTaxProfiles(supabase);

  let selectedRun = null;
  let rows: any[] = [];

  const defaultTaxPercent = cleanNumber(rules?.side_income_tax_percent, 30);
  const defaultTaxMode = cleanText(rules?.tax_deduction_mode) || "manual_percent";

  if (runId) {
    selectedRun = runs.find((run) => run.id === runId) || null;

    const { data: rowData, error: rowError } = await supabase
      .from("payroll_run_rows")
      .select("*")
      .eq("payroll_run_id", runId)
      .order("employee_name_snapshot", { ascending: true });

    if (rowError) throw rowError;

    rows = (rowData || []).map((row: any) =>
      enrichRow(row, getProfileForRow(row, profiles), defaultTaxPercent, defaultTaxMode)
    );
  }

  return {
    runs,
    selectedRun,
    rows,
    rules,
    defaultTaxPercent,
    defaultTaxMode,
    summary: buildSummary(rows),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const selectedRunId = String(req.query.payroll_run_id || "").trim();

      try {
        const data = await loadData(supabase, selectedRunId);
        return res.status(200).json({ ok: true, needsSetup: false, ...data });
      } catch (error: any) {
        if (isMissingTableOrColumnError(error)) {
          return res.status(200).json({
            ok: true,
            needsSetup: true,
            runs: [],
            selectedRun: null,
            rows: [],
            rules: null,
            defaultTaxPercent: 30,
            defaultTaxMode: "manual_percent",
            summary: buildSummary([]),
          });
        }
        throw error;
      }
    }

    if (req.method === "POST") {
      const payrollRunId = cleanText(req.body?.payroll_run_id);
      const fallbackTaxPercent = cleanNumber(req.body?.tax_percent, 30);
      const fallbackTaxMode = cleanText(req.body?.tax_deduction_mode) || "manual_percent";
      const taxNotes = cleanText(req.body?.tax_notes);

      if (!payrollRunId) {
        return res.status(400).json({ ok: false, error: "Välj lönekörning först." });
      }

      const { data: rowsData, error: rowsError } = await supabase
        .from("payroll_run_rows")
        .select("*")
        .eq("payroll_run_id", payrollRunId)
        .order("employee_name_snapshot", { ascending: true });

      if (rowsError) throw rowsError;

      const profiles = await loadTaxProfiles(supabase);

      const calculatedRows = (rowsData || []).map((row: any) => {
        const profile = getProfileForRow(row, profiles);
        const calculated = calculateTax(row, profile, fallbackTaxPercent, fallbackTaxMode);

        const noteParts = [
          calculated.tax_profile_label,
          calculated.tax_table_number ? "Tabell " + calculated.tax_table_number : "",
          calculated.tax_column ? "Kolumn " + calculated.tax_column : "",
          calculated.extra_tax_amount ? "Extra skatt " + calculated.extra_tax_amount + " kr" : "",
          taxNotes || "",
        ].filter(Boolean);

        return {
          id: row.id,
          tax_deduction_mode: calculated.tax_deduction_mode,
          preliminary_tax_percent: calculated.preliminary_tax_percent,
          preliminary_tax_amount: calculated.preliminary_tax_amount,
          net_pay: calculated.net_pay,
          payout_amount: calculated.payout_amount,
          tax_notes: noteParts.join(" · "),
        };
      });

      for (const row of calculatedRows) {
        const { id, ...updateData } = row;

        const { error: updateError } = await supabase
          .from("payroll_run_rows")
          .update({ ...updateData, updated_at: new Date().toISOString() })
          .eq("id", id);

        if (updateError) throw updateError;
      }

      const totals = {
        total_preliminary_tax: roundMoney(calculatedRows.reduce((sum, row) => sum + Number(row.preliminary_tax_amount || 0), 0)),
        total_net_pay: roundMoney(calculatedRows.reduce((sum, row) => sum + Number(row.net_pay || 0), 0)),
        total_payout_amount: roundMoney(calculatedRows.reduce((sum, row) => sum + Number(row.payout_amount || 0), 0)),
      };

      const { data: run, error: runError } = await supabase
        .from("payroll_runs")
        .update({ ...totals, updated_at: new Date().toISOString() })
        .eq("id", payrollRunId)
        .select("*")
        .single();

      if (runError) throw runError;

      const data = await loadData(supabase, payrollRunId);

      return res.status(200).json({ ok: true, run, ...data });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (error: any) {
    console.error("/api/admin/lon/skatt-netto error", error);
    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera skatteavdrag och nettolön.",
    });
  }
}
