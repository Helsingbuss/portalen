import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { requirePayrollAccess } from "@/lib/payrollAccess";

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

const DEFAULT_RULES = {
  employer_fee_standard_percent: 31.42,
  vacation_pay_percent_default: 12,
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

function cleanDate(value: any) {
  const text = cleanText(value);
  return text ? text.slice(0, 10) : null;
}

function roundMoney(value: number) {
  return Number(Number(value || 0).toFixed(2));
}

function employeeName(employee: any) {
  return [employee?.first_name, employee?.last_name].filter(Boolean).join(" ") || "Anställd";
}

async function checkRunTables(supabase: any) {
  const { error: runError } = await supabase
    .from("payroll_runs")
    .select("id")
    .limit(1);

  if (runError && isMissingTableError(runError)) {
    return false;
  }

  if (runError) throw runError;

  const { error: rowError } = await supabase
    .from("payroll_run_rows")
    .select("id")
    .limit(1);

  if (rowError && isMissingTableError(rowError)) {
    return false;
  }

  if (rowError) throw rowError;

  return true;
}

async function loadRules(supabase: any) {
  const { data, error } = await supabase
    .from("payroll_rule_settings")
    .select("*")
    .order("rule_year", { ascending: false })
    .limit(1);

  if (error && !isMissingTableError(error)) {
    throw error;
  }

  return data?.[0] || DEFAULT_RULES;
}

async function buildPreview(supabase: any, periodStart: string, periodEnd: string) {
  const runTablesExist = await checkRunTables(supabase);

  const { data: employeesData, error: employeesError } = await supabase
    .from("staff_employees")
    .select("*");

  if (employeesError) throw employeesError;

  const { data: ratesData, error: ratesError } = await supabase
    .from("payroll_employee_rates")
    .select("*")
    .eq("is_active", true)
    .lte("effective_from", periodEnd)
    .order("effective_from", { ascending: false });

  if (ratesError) throw ratesError;

  const { data: reportsData, error: reportsError } = await supabase
    .from("staff_time_reports")
    .select("*")
    .eq("status", "approved")
    .gte("report_date", periodStart)
    .lte("report_date", periodEnd)
    .order("report_date", { ascending: true });

  if (reportsError) throw reportsError;

  const rules = await loadRules(supabase);

  const employees = (employeesData || []) as any[];
  const rates = (ratesData || []) as any[];
  const reports = (reportsData || []) as any[];

  const grouped: Record<string, any[]> = {};

  for (const report of reports) {
    const employeeId = report.employee_id;
    if (!employeeId) continue;

    if (!grouped[employeeId]) grouped[employeeId] = [];
    grouped[employeeId].push(report);
  }

  const rows = Object.keys(grouped).map((employeeId) => {
    const employee = employees.find((item) => item.id === employeeId);
    const employeeReports = grouped[employeeId] || [];

    const rate = rates.find((item) => {
      if (item.employee_id !== employeeId) return false;
      if (item.effective_to && String(item.effective_to).slice(0, 10) < periodStart) return false;
      return true;
    });

    const hours = roundMoney(
      employeeReports.reduce((sum, report) => sum + Number(report.total_hours || 0), 0)
    );

    const payType = rate?.pay_type || "missing";
    const hourlyRate = Number(rate?.hourly_rate || 0);
    const monthlySalary = Number(rate?.monthly_salary || 0);
    const vacationPercent = Number(
      rate?.vacation_pay_percent ??
      rules?.vacation_pay_percent_default ??
      DEFAULT_RULES.vacation_pay_percent_default
    );

    const employerFeePercent = Number(
      rules?.employer_fee_standard_percent ??
      DEFAULT_RULES.employer_fee_standard_percent
    );

    let grossBase = 0;

    if (payType === "hourly") {
      grossBase = hours * hourlyRate;
    } else if (payType === "monthly") {
      grossBase = monthlySalary;
    }

    grossBase = roundMoney(grossBase);

    const vacationPay = roundMoney(grossBase * vacationPercent / 100);
    const grossTotal = roundMoney(grossBase + vacationPay);
    const employerFee = roundMoney(grossTotal * employerFeePercent / 100);
    const totalCost = roundMoney(grossTotal + employerFee);

    return {
      employee_id: employeeId,
      employee_name: employeeName(employee),
      employee_role: employee?.role || null,
      pay_type: payType,
      hours,
      hourly_rate: hourlyRate || null,
      monthly_salary: monthlySalary || null,
      vacation_percent: vacationPercent,
      gross_base: grossBase,
      vacation_pay: vacationPay,
      gross_total: grossTotal,
      employer_fee_percent: employerFeePercent,
      employer_fee: employerFee,
      total_cost: totalCost,
      source_report_ids: employeeReports.map((report) => report.id),
      report_count: employeeReports.length,
      has_rate: Boolean(rate),
    };
  });

  const summary = {
    employees: rows.length,
    totalHours: roundMoney(rows.reduce((sum, row) => sum + Number(row.hours || 0), 0)),
    grossBase: roundMoney(rows.reduce((sum, row) => sum + Number(row.gross_base || 0), 0)),
    vacationPay: roundMoney(rows.reduce((sum, row) => sum + Number(row.vacation_pay || 0), 0)),
    grossTotal: roundMoney(rows.reduce((sum, row) => sum + Number(row.gross_total || 0), 0)),
    employerFee: roundMoney(rows.reduce((sum, row) => sum + Number(row.employer_fee || 0), 0)),
    totalCost: roundMoney(rows.reduce((sum, row) => sum + Number(row.total_cost || 0), 0)),
    missingRates: rows.filter((row) => !row.has_rate).length,
  };

  return {
    needsSetup: !runTablesExist,
    rows,
    summary,
    rules,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requirePayrollAccess(req, res)) return;

  try {
    const supabase = getSupabase();

    const periodStart = cleanDate(req.method === "GET" ? req.query.period_start : req.body?.period_start);
    const periodEnd = cleanDate(req.method === "GET" ? req.query.period_end : req.body?.period_end);

    if (!periodStart || !periodEnd) {
      return res.status(400).json({
        ok: false,
        error: "Löneperiod saknas.",
      });
    }

    if (req.method === "GET") {
      const preview = await buildPreview(supabase, periodStart, periodEnd);

      return res.status(200).json({
        ok: true,
        ...preview,
      });
    }

    if (req.method === "POST") {
      const preview = await buildPreview(supabase, periodStart, periodEnd);

      if (preview.needsSetup) {
        return res.status(400).json({
          ok: false,
          needsSetup: true,
          error: "Tabellerna payroll_runs och payroll_run_rows saknas.",
        });
      }

      if (!preview.rows.length) {
        return res.status(400).json({
          ok: false,
          error: "Det finns inga godkända tider i vald period.",
        });
      }

      if (preview.summary.missingRates > 0) {
        return res.status(400).json({
          ok: false,
          error: "En eller flera anställda saknar aktiv lönesats.",
          rows: preview.rows,
        });
      }

      const title =
        cleanText(req.body?.title) ||
        "Lönekörning " + periodStart + " - " + periodEnd;

      const payoutDate = cleanDate(req.body?.payout_date);
      const notes = cleanText(req.body?.notes);

      const { data: run, error: runError } = await supabase
        .from("payroll_runs")
        .insert({
          title,
          period_start: periodStart,
          period_end: periodEnd,
          payout_date: payoutDate,
          status: "draft",
          total_employees: preview.summary.employees,
          total_hours: preview.summary.totalHours,
          total_gross_base: preview.summary.grossBase,
          total_vacation_pay: preview.summary.vacationPay,
          total_gross: preview.summary.grossTotal,
          total_employer_fee: preview.summary.employerFee,
          total_cost: preview.summary.totalCost,
          notes,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (runError) throw runError;

      const rowPayload = preview.rows.map((row) => ({
        payroll_run_id: run.id,
        employee_id: row.employee_id,
        employee_name_snapshot: row.employee_name,
        employee_role_snapshot: row.employee_role,
        pay_type: row.pay_type,
        hours: row.hours,
        hourly_rate: row.hourly_rate,
        monthly_salary: row.monthly_salary,
        vacation_percent: row.vacation_percent,
        gross_base: row.gross_base,
        vacation_pay: row.vacation_pay,
        gross_total: row.gross_total,
        employer_fee_percent: row.employer_fee_percent,
        employer_fee: row.employer_fee,
        total_cost: row.total_cost,
        source_report_ids: row.source_report_ids,
        status: "draft",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { data: runRows, error: rowsError } = await supabase
        .from("payroll_run_rows")
        .insert(rowPayload)
        .select("*");

      if (rowsError) throw rowsError;

      return res.status(201).json({
        ok: true,
        run,
        rows: runRows || [],
        summary: preview.summary,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (error: any) {
    console.error("/api/admin/lon/lonekoring/skapa error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte skapa lönekörning.",
    });
  }
}
