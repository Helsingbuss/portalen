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

function cleanText(value: any) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function cleanDate(value: any) {
  const text = cleanText(value);
  return text ? text.slice(0, 10) : null;
}

function cleanNumber(value: any) {
  if (value === "" || value === null || value === undefined) return 0;
  const normalized = String(value).replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
}

function normalizeRow(row: any) {
  return {
    id: cleanText(row.id),
    pay_type: cleanText(row.pay_type) || "hourly",
    hours: cleanNumber(row.hours),
    hourly_rate: cleanNumber(row.hourly_rate),
    monthly_salary: cleanNumber(row.monthly_salary),
    vacation_percent: cleanNumber(row.vacation_percent),
    gross_base: cleanNumber(row.gross_base),
    vacation_pay: cleanNumber(row.vacation_pay),
    gross_total: cleanNumber(row.gross_total),
    employer_fee_percent: cleanNumber(row.employer_fee_percent),
    employer_fee: cleanNumber(row.employer_fee),
    total_cost: cleanNumber(row.total_cost),
    status: cleanText(row.status) || "draft",
    notes: cleanText(row.notes),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requirePayrollAccess(req, res)) return;

  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({ ok: false, error: "Lönekörnings-ID saknas." });
  }

  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const { data: run, error: runError } = await supabase
        .from("payroll_runs")
        .select("*")
        .eq("id", id)
        .single();

      if (runError) throw runError;

      const { data: rows, error: rowsError } = await supabase
        .from("payroll_run_rows")
        .select("*")
        .eq("payroll_run_id", id)
        .order("employee_name_snapshot", { ascending: true });

      if (rowsError) throw rowsError;

      return res.status(200).json({
        ok: true,
        run,
        rows: rows || [],
      });
    }

    if (req.method === "PUT") {
      const runInput = req.body?.run || {};
      const rowInput = Array.isArray(req.body?.rows) ? req.body.rows : [];

      const normalizedRows = rowInput.map(normalizeRow).filter((row) => row.id);

      for (const row of normalizedRows) {
        const { id: rowId, ...updateRow } = row;

        const { error: rowError } = await supabase
          .from("payroll_run_rows")
          .update({
            ...updateRow,
            updated_at: new Date().toISOString(),
          })
          .eq("id", rowId)
          .eq("payroll_run_id", id);

        if (rowError) throw rowError;
      }

      const totals = {
        total_employees: normalizedRows.length,
        total_hours: Number(normalizedRows.reduce((sum, row) => sum + Number(row.hours || 0), 0).toFixed(2)),
        total_gross_base: Number(normalizedRows.reduce((sum, row) => sum + Number(row.gross_base || 0), 0).toFixed(2)),
        total_vacation_pay: Number(normalizedRows.reduce((sum, row) => sum + Number(row.vacation_pay || 0), 0).toFixed(2)),
        total_gross: Number(normalizedRows.reduce((sum, row) => sum + Number(row.gross_total || 0), 0).toFixed(2)),
        total_employer_fee: Number(normalizedRows.reduce((sum, row) => sum + Number(row.employer_fee || 0), 0).toFixed(2)),
        total_cost: Number(normalizedRows.reduce((sum, row) => sum + Number(row.total_cost || 0), 0).toFixed(2)),
      };

      const { data: run, error: runError } = await supabase
        .from("payroll_runs")
        .update({
          title: cleanText(runInput.title) || "Lönekörning",
          period_start: cleanDate(runInput.period_start),
          period_end: cleanDate(runInput.period_end),
          payout_date: cleanDate(runInput.payout_date),
          status: cleanText(runInput.status) || "draft",
          notes: cleanText(runInput.notes),
          ...totals,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();

      if (runError) throw runError;

      const { data: rows, error: rowsError } = await supabase
        .from("payroll_run_rows")
        .select("*")
        .eq("payroll_run_id", id)
        .order("employee_name_snapshot", { ascending: true });

      if (rowsError) throw rowsError;

      return res.status(200).json({
        ok: true,
        run,
        rows: rows || [],
      });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (error: any) {
    console.error("/api/admin/lon/lonekoring/[id] error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera lönekörningen.",
    });
  }
}
