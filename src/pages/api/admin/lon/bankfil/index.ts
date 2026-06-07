import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { requirePayrollAccess } from "@/lib/payrollAccess";

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

function roundMoney(value: number) {
  return Number(Number(value || 0).toFixed(2));
}

function buildBankRows(rows: any[], bankDetails: any[]) {
  return rows.map((row) => {
    const bank = bankDetails.find(
      (item) => item.employee_id === row.employee_id && item.is_active !== false
    );

    const payoutAmount = roundMoney(Number(row.net_pay || row.payout_amount || row.gross_total || 0));

    const missingBank =
      !bank ||
      (!bank.iban && (!bank.clearing_number || !bank.account_number));

    return {
      payroll_row_id: row.id,
      payroll_run_id: row.payroll_run_id,
      employee_id: row.employee_id,
      employee_name: row.employee_name_snapshot || "Anställd",
      employee_role: row.employee_role_snapshot || null,
      payslip_status: row.status || "draft",

      gross_total: roundMoney(Number(row.gross_total || 0)),
      payout_amount: payoutAmount,

      bank_detail_id: bank?.id || null,
      recipient_name: bank?.recipient_name || row.employee_name_snapshot || "",
      bank_name: bank?.bank_name || "",
      clearing_number: bank?.clearing_number || "",
      account_number: bank?.account_number || "",
      iban: bank?.iban || "",
      bic: bank?.bic || "",
      payslip_email: bank?.payslip_email || "",

      missing_bank: missingBank,
      can_export: !missingBank && payoutAmount > 0,
      notes: bank?.notes || row.notes || "",
    };
  });
}

function buildSummary(bankRows: any[]) {
  return {
    rows: bankRows.length,
    ready: bankRows.filter((row) => row.can_export).length,
    missingBank: bankRows.filter((row) => row.missing_bank).length,
    zeroAmount: bankRows.filter((row) => Number(row.payout_amount || 0) <= 0).length,
    totalPayout: roundMoney(
      bankRows.reduce((sum, row) => sum + Number(row.payout_amount || 0), 0)
    ),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requirePayrollAccess(req, res)) return;

  try {
    const supabase = getSupabase();

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const selectedRunId = String(req.query.payroll_run_id || "").trim();

    const { data: runsData, error: runsError } = await supabase
      .from("payroll_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (runsError) {
      if (isMissingTableError(runsError)) {
        return res.status(200).json({
          ok: true,
          needsSetup: true,
          runs: [],
          selectedRun: null,
          rows: [],
          summary: buildSummary([]),
        });
      }

      throw runsError;
    }

    const runs = (runsData || []) as any[];
    const runId = selectedRunId || runs?.[0]?.id || "";

    let selectedRun = null;
    let rows: any[] = [];

    if (runId) {
      selectedRun = runs.find((run) => run.id === runId) || null;

      const { data: rowData, error: rowError } = await supabase
        .from("payroll_run_rows")
        .select("*")
        .eq("payroll_run_id", runId)
        .order("employee_name_snapshot", { ascending: true });

      if (rowError) throw rowError;

      const { data: bankData, error: bankError } = await supabase
        .from("payroll_employee_bank_details")
        .select("*")
        .eq("is_active", true);

      if (bankError) {
        if (isMissingTableError(bankError)) {
          return res.status(200).json({
            ok: true,
            needsSetup: true,
            runs,
            selectedRun,
            rows: [],
            summary: buildSummary([]),
            missingBankTable: true,
          });
        }

        throw bankError;
      }

      rows = buildBankRows(rowData || [], bankData || []);
    }

    return res.status(200).json({
      ok: true,
      needsSetup: false,
      runs,
      selectedRun,
      rows,
      summary: buildSummary(rows),
    });
  } catch (error: any) {
    console.error("/api/admin/lon/bankfil error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hämta bankunderlag.",
    });
  }
}
