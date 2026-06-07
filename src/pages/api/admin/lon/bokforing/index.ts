
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

function money(value: any) {
  return Number(Number(value || 0).toFixed(2));
}

function cleanText(value: any) {
  const text = String(value ?? "").trim();
  return text.length ? text : "";
}

function getAccounts(query: any) {
  return {
    wageAccount: cleanText(query.wageAccount) || "7010",
    vacationAccount: cleanText(query.vacationAccount) || "7090",
    employerFeeAccount: cleanText(query.employerFeeAccount) || "7510",
    taxLiabilityAccount: cleanText(query.taxLiabilityAccount) || "2710",
    employerFeeLiabilityAccount: cleanText(query.employerFeeLiabilityAccount) || "2731",
    netPayLiabilityAccount: cleanText(query.netPayLiabilityAccount) || "2910",
  };
}

function buildLines(run: any, rows: any[], accounts: any) {
  const grossBase = money(rows.reduce((sum, row) => sum + Number(row.gross_base || 0), 0));
  const vacationPay = money(rows.reduce((sum, row) => sum + Number(row.vacation_pay || 0), 0));
  const tax = money(rows.reduce((sum, row) => sum + Number(row.preliminary_tax_amount || 0), 0));
  const net = money(rows.reduce((sum, row) => sum + Number(row.payout_amount || row.net_pay || 0), 0));
  const employerFee = money(rows.reduce((sum, row) => sum + Number(row.employer_fee || 0), 0));

  const lines = [
    {
      account: accounts.wageAccount,
      description: "Löner",
      debit: grossBase,
      credit: 0,
      type: "debit",
    },
    {
      account: accounts.vacationAccount,
      description: "Semesterersättning",
      debit: vacationPay,
      credit: 0,
      type: "debit",
    },
    {
      account: accounts.employerFeeAccount,
      description: "Arbetsgivaravgifter",
      debit: employerFee,
      credit: 0,
      type: "debit",
    },
    {
      account: accounts.taxLiabilityAccount,
      description: "Preliminär skatt",
      debit: 0,
      credit: tax,
      type: "credit",
    },
    {
      account: accounts.employerFeeLiabilityAccount,
      description: "Upplupna arbetsgivaravgifter",
      debit: 0,
      credit: employerFee,
      type: "credit",
    },
    {
      account: accounts.netPayLiabilityAccount,
      description: "Nettolön / löneutbetalning",
      debit: 0,
      credit: net,
      type: "credit",
    },
  ].filter((line) => Number(line.debit || 0) > 0 || Number(line.credit || 0) > 0);

  const totalDebit = money(lines.reduce((sum, line) => sum + Number(line.debit || 0), 0));
  const totalCredit = money(lines.reduce((sum, line) => sum + Number(line.credit || 0), 0));

  return {
    lines,
    summary: {
      employees: rows.length,
      grossBase,
      vacationPay,
      grossTotal: money(grossBase + vacationPay),
      tax,
      net,
      employerFee,
      totalCost: money(grossBase + vacationPay + employerFee),
      totalDebit,
      totalCredit,
      difference: money(totalDebit - totalCredit),
      balanced: Math.abs(totalDebit - totalCredit) < 0.01,
    },
  };
}

async function loadData(supabase: any, selectedRunId: string, accounts: any) {
  const { data: runsData, error: runsError } = await supabase
    .from("payroll_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (runsError) throw runsError;

  const runs = runsData || [];
  const runId = selectedRunId || runs?.[0]?.id || "";

  let selectedRun = null;
  let rows: any[] = [];
  let lines: any[] = [];
  let summary = {
    employees: 0,
    grossBase: 0,
    vacationPay: 0,
    grossTotal: 0,
    tax: 0,
    net: 0,
    employerFee: 0,
    totalCost: 0,
    totalDebit: 0,
    totalCredit: 0,
    difference: 0,
    balanced: true,
  };

  if (runId) {
    selectedRun = runs.find((run: any) => run.id === runId) || null;

    const { data: rowsData, error: rowsError } = await supabase
      .from("payroll_run_rows")
      .select("*")
      .eq("payroll_run_id", runId)
      .order("employee_name_snapshot", { ascending: true });

    if (rowsError) throw rowsError;

    rows = rowsData || [];

    const built = buildLines(selectedRun, rows, accounts);
    lines = built.lines;
    summary = built.summary;
  }

  return {
    runs,
    selectedRun,
    rows,
    lines,
    summary,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (req.method === "POST") {
      const payrollRunId = cleanText(req.body?.payroll_run_id);
      const reference = cleanText(req.body?.accounting_export_reference);
      const notes = cleanText(req.body?.accounting_export_notes);

      if (!payrollRunId) {
        return res.status(400).json({
          ok: false,
          error: "Lönekörning saknas.",
        });
      }

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("payroll_runs")
        .update({
          accounting_exported_at: now,
          accounting_export_reference: reference,
          accounting_export_notes: notes,
          updated_at: now,
        })
        .eq("id", payrollRunId)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        run: data,
      });
    }

    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
      });
    }

    const selectedRunId = cleanText(req.query.payroll_run_id);
    const accounts = getAccounts(req.query);

    const data = await loadData(supabase, selectedRunId, accounts);

    return res.status(200).json({
      ok: true,
      accounts,
      ...data,
    });
  } catch (error: any) {
    console.error("/api/admin/lon/bokforing error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hämta bokföringsunderlag.",
    });
  }
}
