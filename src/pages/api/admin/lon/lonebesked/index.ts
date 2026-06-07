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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requirePayrollAccess(req, res)) return;

  try {
    const supabase = getSupabase();

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const q = String(req.query.q || "").trim().toLowerCase();
    const status = String(req.query.status || "").trim();
    const runId = String(req.query.payroll_run_id || "").trim();

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
          payslips: [],
          summary: {
            total: 0,
            draft: 0,
            approved: 0,
            sent: 0,
            paid: 0,
            grossTotal: 0,
            totalCost: 0,
          },
        });
      }

      throw runsError;
    }

    let query = supabase
      .from("payroll_run_rows")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (status) query = query.eq("status", status);
    if (runId) query = query.eq("payroll_run_id", runId);

    const { data: rowsData, error: rowsError } = await query;

    if (rowsError) {
      if (isMissingTableError(rowsError)) {
        return res.status(200).json({
          ok: true,
          needsSetup: true,
          runs: runsData || [],
          payslips: [],
          summary: {
            total: 0,
            draft: 0,
            approved: 0,
            sent: 0,
            paid: 0,
            grossTotal: 0,
            totalCost: 0,
          },
        });
      }

      throw rowsError;
    }

    const runs = (runsData || []) as any[];
    let payslips = (rowsData || []) as any[];

    if (q) {
      payslips = payslips.filter((row) => {
        const run = runs.find((item) => item.id === row.payroll_run_id);

        const haystack = [
          row.employee_name_snapshot,
          row.employee_role_snapshot,
          row.pay_type,
          row.status,
          row.notes,
          run?.title,
          run?.period_start,
          run?.period_end,
          run?.payout_date,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      });
    }

    const summary = {
      total: payslips.length,
      draft: payslips.filter((row) => row.status === "draft").length,
      approved: payslips.filter((row) => row.status === "approved").length,
      sent: payslips.filter((row) => row.status === "sent").length,
      paid: payslips.filter((row) => row.status === "paid").length,
      grossTotal: Number(
        payslips.reduce((sum, row) => sum + Number(row.gross_total || 0), 0).toFixed(2)
      ),
      totalCost: Number(
        payslips.reduce((sum, row) => sum + Number(row.total_cost || 0), 0).toFixed(2)
      ),
    };

    return res.status(200).json({
      ok: true,
      needsSetup: false,
      runs,
      payslips,
      summary,
    });
  } catch (error: any) {
    console.error("/api/admin/lon/lonebesked error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hämta lönebesked.",
    });
  }
}
