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

function buildSummary(rows: any[]) {
  return {
    rows: rows.length,
    totalHours: Number(rows.reduce((sum, row) => sum + Number(row.hours || 0), 0).toFixed(2)),
    grossBase: Number(rows.reduce((sum, row) => sum + Number(row.gross_base || 0), 0).toFixed(2)),
    vacationPay: Number(rows.reduce((sum, row) => sum + Number(row.vacation_pay || 0), 0).toFixed(2)),
    grossTotal: Number(rows.reduce((sum, row) => sum + Number(row.gross_total || 0), 0).toFixed(2)),
    employerFee: Number(rows.reduce((sum, row) => sum + Number(row.employer_fee || 0), 0).toFixed(2)),
    totalCost: Number(rows.reduce((sum, row) => sum + Number(row.total_cost || 0), 0).toFixed(2)),
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

      const { data: rowsData, error: rowsError } = await supabase
        .from("payroll_run_rows")
        .select("*")
        .eq("payroll_run_id", runId)
        .order("employee_name_snapshot", { ascending: true });

      if (rowsError) {
        if (isMissingTableError(rowsError)) {
          return res.status(200).json({
            ok: true,
            needsSetup: true,
            runs,
            selectedRun,
            rows: [],
            summary: buildSummary([]),
          });
        }

        throw rowsError;
      }

      rows = (rowsData || []) as any[];
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
    console.error("/api/admin/lon/export error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hämta exportunderlag.",
    });
  }
}
