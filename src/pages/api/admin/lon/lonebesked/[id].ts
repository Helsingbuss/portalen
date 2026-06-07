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
  const normalized = String(value).replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : fallback;
}

function roundMoney(value: number) {
  return Number(Number(value || 0).toFixed(2));
}

function buildRowData(body: any) {
  const payType = cleanText(body.pay_type) || "hourly";

  const hours = cleanNumber(body.hours);
  const hourlyRate = cleanNumber(body.hourly_rate);
  const monthlySalary = cleanNumber(body.monthly_salary);
  const vacationPercent = cleanNumber(body.vacation_percent, 12);
  const employerFeePercent = cleanNumber(body.employer_fee_percent, 31.42);

  const grossBase =
    payType === "monthly"
      ? monthlySalary
      : hours * hourlyRate;

  const vacationPay = grossBase * vacationPercent / 100;
  const grossTotal = grossBase + vacationPay;

  const preliminaryTaxPercent = cleanNumber(body.preliminary_tax_percent, 30);

  let preliminaryTaxAmount = cleanNumber(
    body.preliminary_tax_amount,
    grossTotal * preliminaryTaxPercent / 100
  );

  preliminaryTaxAmount = Math.max(0, Math.min(preliminaryTaxAmount, grossTotal));

  const netPay = roundMoney(grossTotal - preliminaryTaxAmount);
  const payoutAmount = cleanNumber(body.payout_amount, netPay);

  const employerFee = grossTotal * employerFeePercent / 100;
  const totalCost = grossTotal + employerFee;

  return {
    pay_type: payType,
    hours: roundMoney(hours),
    hourly_rate: roundMoney(hourlyRate),
    monthly_salary: roundMoney(monthlySalary),

    vacation_percent: roundMoney(vacationPercent),
    gross_base: roundMoney(grossBase),
    vacation_pay: roundMoney(vacationPay),
    gross_total: roundMoney(grossTotal),

    preliminary_tax_percent: roundMoney(preliminaryTaxPercent),
    preliminary_tax_amount: roundMoney(preliminaryTaxAmount),
    net_pay: roundMoney(netPay),
    payout_amount: roundMoney(payoutAmount),
    tax_deduction_mode: cleanText(body.tax_deduction_mode) || "manual_percent",
    tax_notes: cleanText(body.tax_notes),

    employer_fee_percent: roundMoney(employerFeePercent),
    employer_fee: roundMoney(employerFee),
    total_cost: roundMoney(totalCost),

    status: cleanText(body.status) || "draft",
    notes: cleanText(body.notes),

    updated_at: new Date().toISOString(),
  };
}

async function updatePayrollRunTotals(supabase: any, payrollRunId: string | null | undefined) {
  if (!payrollRunId) return;

  const { data: rows, error } = await supabase
    .from("payroll_run_rows")
    .select("*")
    .eq("payroll_run_id", payrollRunId);

  if (error) throw error;

  const list = rows || [];

  const totals = {
    total_employees: list.length,
    total_hours: roundMoney(list.reduce((sum: number, row: any) => sum + Number(row.hours || 0), 0)),
    total_gross_base: roundMoney(list.reduce((sum: number, row: any) => sum + Number(row.gross_base || 0), 0)),
    total_vacation_pay: roundMoney(list.reduce((sum: number, row: any) => sum + Number(row.vacation_pay || 0), 0)),
    total_gross: roundMoney(list.reduce((sum: number, row: any) => sum + Number(row.gross_total || 0), 0)),
    total_preliminary_tax: roundMoney(list.reduce((sum: number, row: any) => sum + Number(row.preliminary_tax_amount || 0), 0)),
    total_net_pay: roundMoney(list.reduce((sum: number, row: any) => sum + Number(row.net_pay || 0), 0)),
    total_payout_amount: roundMoney(list.reduce((sum: number, row: any) => sum + Number(row.payout_amount || row.net_pay || 0), 0)),
    total_employer_fee: roundMoney(list.reduce((sum: number, row: any) => sum + Number(row.employer_fee || 0), 0)),
    total_cost: roundMoney(list.reduce((sum: number, row: any) => sum + Number(row.total_cost || 0), 0)),
    updated_at: new Date().toISOString(),
  };

  const { error: updateError } = await supabase
    .from("payroll_runs")
    .update(totals)
    .eq("id", payrollRunId);

  if (updateError) throw updateError;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({ ok: false, error: "Lönebesked-ID saknas." });
  }

  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const { data: payslip, error: payslipError } = await supabase
        .from("payroll_run_rows")
        .select("*")
        .eq("id", id)
        .single();

      if (payslipError) throw payslipError;

      let run = null;

      if (payslip?.payroll_run_id) {
        const { data: runData, error: runError } = await supabase
          .from("payroll_runs")
          .select("*")
          .eq("id", payslip.payroll_run_id)
          .single();

        if (runError) throw runError;
        run = runData;
      }

      return res.status(200).json({
        ok: true,
        payslip,
        run,
      });
    }

    if (req.method === "PUT") {
      const updateData = buildRowData(req.body || {});

      const { data: payslip, error } = await supabase
        .from("payroll_run_rows")
        .update(updateData)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      await updatePayrollRunTotals(supabase, payslip?.payroll_run_id);

      return res.status(200).json({
        ok: true,
        payslip,
      });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (error: any) {
    console.error("/api/admin/lon/lonebesked/[id] error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera lönebesked.",
    });
  }
}
