import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { getBearerToken, verifyPersonalToken } from "@/lib/personalAuth";

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

function buildSummary(rows: any[]) {
  return {
    total: rows.length,
    sent: rows.filter((row) => row.email_status === "sent").length,
    paid: rows.filter((row) => row.status === "paid").length,
    totalGross: Number(rows.reduce((sum, row) => sum + Number(row.gross_total || 0), 0).toFixed(2)),
    totalTax: Number(rows.reduce((sum, row) => sum + Number(row.preliminary_tax_amount || 0), 0).toFixed(2)),
    totalNet: Number(rows.reduce((sum, row) => sum + Number(row.net_pay || row.payout_amount || 0), 0).toFixed(2)),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
      });
    }

    const token = getBearerToken(req);
    const payload = verifyPersonalToken(token);

    if (!payload) {
      return res.status(401).json({
        ok: false,
        error: "Du är inte inloggad.",
      });
    }

    const supabase = getSupabase();

    const { data: employee, error: employeeError } = await supabase
      .from("staff_employees")
      .select("*")
      .eq("id", payload.employee_id)
      .maybeSingle();

    if (employeeError) throw employeeError;

    if (!employee) {
      return res.status(401).json({
        ok: false,
        error: "Kunde inte hitta personalprofil.",
      });
    }

    const { data: rowsData, error: rowsError } = await supabase
      .from("payroll_run_rows")
      .select("*")
      .eq("employee_id", employee.id)
      .eq("app_published", true)
      .order("created_at", { ascending: false });

    if (rowsError) throw rowsError;

    const rows = rowsData || [];
    const runIds = Array.from(new Set(rows.map((row: any) => row.payroll_run_id).filter(Boolean)));

    let runs: any[] = [];

    if (runIds.length > 0) {
      const { data: runsData, error: runsError } = await supabase
        .from("payroll_runs")
        .select("*")
        .in("id", runIds);

      if (runsError) throw runsError;
      runs = runsData || [];
    }

    const payslips = rows.map((row: any) => ({
      ...row,
      run: runs.find((run) => run.id === row.payroll_run_id) || null,
    }));

    return res.status(200).json({
      ok: true,
      employee: {
        id: employee.id,
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email,
        role: employee.role,
      },
      payslips,
      summary: buildSummary(rows),
    });
  } catch (error: any) {
    console.error("/api/personal/lonebesked error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hämta dina lönebesked.",
    });
  }
}
