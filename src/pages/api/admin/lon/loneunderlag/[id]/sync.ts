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

function n(value: any) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: any) {
  return Number(n(value).toFixed(2));
}

function dateOnly(value: any) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function inPeriod(dateValue: any, start: string, end: string) {
  const d = dateOnly(dateValue);
  if (!d) return false;
  return d >= start && d <= end;
}

function employeeName(row: any) {
  return row.employee_name_snapshot || "Anställd";
}

function rowHourlyRate(row: any) {
  const hourlyRate = n(row.hourly_rate);

  if (hourlyRate > 0) return hourlyRate;

  const monthlySalary = n(row.monthly_salary);
  if (monthlySalary > 0) return monthlySalary / 174;

  return 0;
}

function calculateTaxableGross(row: any, adjustments: any) {
  const originalGross = n(row.gross_total);
  const baseGross = originalGross > 0 ? originalGross : n(row.gross_base) + n(row.vacation_pay);

  return money(
    baseGross -
    n(adjustments.absence_deduction) +
    n(adjustments.ob_allowance_amount) +
    n(adjustments.per_diem_taxable_amount) +
    n(adjustments.bonus_amount)
  );
}

function calculateTax(row: any, grossTotal: number) {
  const taxPercent = n(row.preliminary_tax_percent);
  return money(grossTotal * taxPercent / 100);
}

function calculateEmployerFee(row: any, grossTotal: number) {
  const feePercent = n(row.employer_fee_percent);
  return money(grossTotal * feePercent / 100);
}

function buildNotes(parts: string[]) {
  return parts.filter(Boolean).join(" | ");
}

async function safeSelect(supabase: any, table: string, filters: (query: any) => any) {
  let query = supabase.from(table).select("*");

  query = filters(query);

  const { data, error } = await query;

  if (error) {
    const message = String(error.message || "").toLowerCase();

    if (
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      message.includes("does not exist") ||
      message.includes("could not find")
    ) {
      return [];
    }

    throw error;
  }

  return data || [];
}

async function loadRun(supabase: any, id: string) {
  const { data, error } = await supabase
    .from("payroll_runs")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  return data;
}

async function loadRows(supabase: any, id: string) {
  const { data, error } = await supabase
    .from("payroll_run_rows")
    .select("*")
    .eq("payroll_run_id", id)
    .order("employee_name_snapshot", { ascending: true });

  if (error) throw error;

  return data || [];
}

async function loadApprovedUnderlag(supabase: any, start: string, end: string) {
  const absences = await safeSelect(supabase, "payroll_absences", (query: any) =>
    query
      .eq("status", "approved")
      .eq("affects_payroll", true)
      .gte("start_date", start)
      .lte("start_date", end)
  );

  const obAllowances = await safeSelect(supabase, "payroll_ob_allowances", (query: any) =>
    query
      .eq("status", "approved")
      .eq("affects_payroll", true)
      .gte("work_date", start)
      .lte("work_date", end)
  );

  const perDiems = await safeSelect(supabase, "payroll_per_diems", (query: any) =>
    query
      .eq("status", "approved")
      .eq("affects_payroll", true)
      .gte("trip_start_date", start)
      .lte("trip_start_date", end)
  );

  const bonuses = await safeSelect(supabase, "payroll_bonus_commissions", (query: any) =>
    query
      .eq("status", "approved")
      .eq("affects_payroll", true)
      .gte("earning_date", start)
      .lte("earning_date", end)
  );

  return {
    absences,
    obAllowances,
    perDiems,
    bonuses,
  };
}

function calculateAdjustmentsForRow(row: any, underlag: any) {
  const employeeId = row.employee_id;
  const hourlyRate = rowHourlyRate(row);

  const absences = underlag.absences.filter((item: any) => item.employee_id === employeeId);
  const obAllowances = underlag.obAllowances.filter((item: any) => item.employee_id === employeeId);
  const perDiems = underlag.perDiems.filter((item: any) => item.employee_id === employeeId);
  const bonuses = underlag.bonuses.filter((item: any) => item.employee_id === employeeId);

  const absenceHours = money(absences.reduce((sum: number, item: any) => sum + n(item.hours), 0));

  const absenceDeduction = money(absences.reduce((sum: number, item: any) => {
    const paidPercent = n(item.paid_percent);
    const unpaidPercent = Math.max(0, 100 - paidPercent);
    const deduction = n(item.hours) * hourlyRate * unpaidPercent / 100;

    return sum + deduction;
  }, 0));

  const obAmount = money(obAllowances.reduce((sum: number, item: any) => sum + n(item.amount), 0));

  const perDiemTaxFreeAmount = money(perDiems
    .filter((item: any) => item.tax_free !== false)
    .reduce((sum: number, item: any) => sum + n(item.amount), 0));

  const perDiemTaxableAmount = money(perDiems
    .filter((item: any) => item.tax_free === false)
    .reduce((sum: number, item: any) => sum + n(item.amount), 0));

  const bonusAmount = money(bonuses.reduce((sum: number, item: any) => sum + n(item.amount), 0));

  const notes = buildNotes([
    absences.length ? "Frånvaro: " + absences.length + " post(er), " + absenceHours + " h" : "",
    obAllowances.length ? "OB/tillägg: " + obAllowances.length + " post(er)" : "",
    perDiems.length ? "Traktamente: " + perDiems.length + " post(er)" : "",
    bonuses.length ? "Bonus/provision: " + bonuses.length + " post(er)" : "",
  ]);

  return {
    absence_hours: absenceHours,
    absence_deduction: absenceDeduction,
    ob_allowance_amount: obAmount,
    per_diem_tax_free_amount: perDiemTaxFreeAmount,
    per_diem_taxable_amount: perDiemTaxableAmount,
    bonus_amount: bonusAmount,
    payroll_adjustment_notes: notes,
    counts: {
      absences: absences.length,
      obAllowances: obAllowances.length,
      perDiems: perDiems.length,
      bonuses: bonuses.length,
    },
  };
}

function buildRunTotals(rows: any[]) {
  return {
    total_employees: rows.length,
    total_hours: money(rows.reduce((sum, row) => sum + n(row.hours), 0)),
    total_gross: money(rows.reduce((sum, row) => sum + n(row.gross_total), 0)),
    total_preliminary_tax: money(rows.reduce((sum, row) => sum + n(row.preliminary_tax_amount), 0)),
    total_net_pay: money(rows.reduce((sum, row) => sum + n(row.net_pay), 0)),
    total_payout_amount: money(rows.reduce((sum, row) => sum + n(row.payout_amount || row.net_pay), 0)),
    total_employer_fee: money(rows.reduce((sum, row) => sum + n(row.employer_fee), 0)),
    total_cost: money(rows.reduce((sum, row) => sum + n(row.total_cost), 0)),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({
      ok: false,
      error: "Lönekörnings-ID saknas.",
    });
  }

  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
      });
    }

    const supabase = getSupabase();

    const run = await loadRun(supabase, id);
    const rows = await loadRows(supabase, id);

    const periodStart = dateOnly(run.period_start);
    const periodEnd = dateOnly(run.period_end);

    if (!periodStart || !periodEnd) {
      return res.status(400).json({
        ok: false,
        error: "Lönekörningen saknar period.",
      });
    }

    const underlag = await loadApprovedUnderlag(supabase, periodStart, periodEnd);

    const updatedRows = [];
    const syncTime = new Date().toISOString();

    let totalAbsences = 0;
    let totalOb = 0;
    let totalPerDiem = 0;
    let totalBonus = 0;

    for (const row of rows) {
      const adjustments = calculateAdjustmentsForRow(row, underlag);

      totalAbsences += adjustments.counts.absences;
      totalOb += adjustments.counts.obAllowances;
      totalPerDiem += adjustments.counts.perDiems;
      totalBonus += adjustments.counts.bonuses;

      const grossTotal = calculateTaxableGross(row, adjustments);
      const taxAmount = calculateTax(row, grossTotal);
      const netPay = money(grossTotal - taxAmount + n(adjustments.per_diem_tax_free_amount));
      const payoutAmount = netPay;
      const employerFee = calculateEmployerFee(row, grossTotal);
      const totalCost = money(grossTotal + employerFee + n(adjustments.per_diem_tax_free_amount));

      const updateData = {
        absence_hours: adjustments.absence_hours,
        absence_deduction: adjustments.absence_deduction,
        ob_allowance_amount: adjustments.ob_allowance_amount,
        per_diem_tax_free_amount: adjustments.per_diem_tax_free_amount,
        per_diem_taxable_amount: adjustments.per_diem_taxable_amount,
        bonus_amount: adjustments.bonus_amount,
        payroll_adjustment_notes: adjustments.payroll_adjustment_notes,
        payroll_underlag_synced_at: syncTime,

        gross_total: grossTotal,
        preliminary_tax_amount: taxAmount,
        net_pay: netPay,
        payout_amount: payoutAmount,
        employer_fee: employerFee,
        total_cost: totalCost,
        updated_at: syncTime,
      };

      const { data: updated, error: updateError } = await supabase
        .from("payroll_run_rows")
        .update(updateData)
        .eq("id", row.id)
        .select("*")
        .single();

      if (updateError) throw updateError;

      updatedRows.push(updated);
    }

    const totals = buildRunTotals(updatedRows);

    const { data: updatedRun, error: runUpdateError } = await supabase
      .from("payroll_runs")
      .update({
        ...totals,
        payroll_underlag_synced_at: syncTime,
        payroll_underlag_summary: {
          absences: totalAbsences,
          obAllowances: totalOb,
          perDiems: totalPerDiem,
          bonuses: totalBonus,
          syncedAt: syncTime,
        },
        updated_at: syncTime,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (runUpdateError) throw runUpdateError;

    return res.status(200).json({
      ok: true,
      run: updatedRun,
      rows: updatedRows,
      summary: {
        periodStart,
        periodEnd,
        employees: rows.length,
        absences: totalAbsences,
        obAllowances: totalOb,
        perDiems: totalPerDiem,
        bonuses: totalBonus,
        ...totals,
      },
    });
  } catch (error: any) {
    console.error("/api/admin/lon/loneunderlag/[id]/sync error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte koppla löneunderlag.",
    });
  }
}
