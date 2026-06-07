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

function cleanNumber(value: any, fallback = 0) {
  if (value === "" || value === null || value === undefined) return fallback;
  const normalized = String(value).replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : fallback;
}

function cleanBoolean(value: any, fallback = true) {
  if (value === true || value === "true" || value === "1" || value === 1) return true;
  if (value === false || value === "false" || value === "0" || value === 0) return false;
  return fallback;
}

function isMissingTableError(error: any) {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();

  return (
    code === "42p01" ||
    code === "pgrst205" ||
    message.includes("does not exist") ||
    message.includes("could not find the table") ||
    message.includes("schema cache")
  );
}

function buildAllowance(body: any) {
  const hours = cleanNumber(body.hours, 0);
  const rate = cleanNumber(body.rate, 0);
  const manualAmount = cleanNumber(body.amount, hours * rate);
  const amount = manualAmount || hours * rate;

  return {
    employee_id: cleanText(body.employee_id),
    allowance_type: cleanText(body.allowance_type) || "ob_evening",
    work_date: cleanText(body.work_date),
    start_time: cleanText(body.start_time),
    end_time: cleanText(body.end_time),
    hours,
    rate,
    amount: Number(Number(amount || 0).toFixed(2)),
    affects_payroll: cleanBoolean(body.affects_payroll, true),
    status: cleanText(body.status) || "draft",
    title: cleanText(body.title),
    notes: cleanText(body.notes),
    updated_at: new Date().toISOString(),
  };
}

async function loadEmployees(supabase: any) {
  const { data, error } = await supabase
    .from("staff_employees")
    .select("*")
    .order("first_name", { ascending: true })
    .order("last_name", { ascending: true });

  if (error) throw error;

  return data || [];
}

function buildSummary(rows: any[]) {
  return {
    total: rows.length,
    draft: rows.filter((row) => row.status === "draft").length,
    submitted: rows.filter((row) => row.status === "submitted").length,
    approved: rows.filter((row) => row.status === "approved").length,
    rejected: rows.filter((row) => row.status === "rejected").length,
    payrollRelevant: rows.filter((row) => row.affects_payroll).length,
    evening: rows.filter((row) => row.allowance_type === "ob_evening").length,
    night: rows.filter((row) => row.allowance_type === "ob_night").length,
    weekend: rows.filter((row) => row.allowance_type === "ob_weekend").length,
    totalHours: Number(rows.reduce((sum, row) => sum + Number(row.hours || 0), 0).toFixed(2)),
    totalAmount: Number(rows.reduce((sum, row) => sum + Number(row.amount || 0), 0).toFixed(2)),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requirePayrollAccess(req, res)) return;

  try {
    const supabase = getSupabase();

    if (req.method === "POST") {
      const allowance = buildAllowance(req.body || {});

      if (!allowance.employee_id) {
        return res.status(400).json({
          ok: false,
          error: "Anställd saknas.",
        });
      }

      if (!allowance.work_date) {
        return res.status(400).json({
          ok: false,
          error: "Datum saknas.",
        });
      }

      const { data, error } = await supabase
        .from("payroll_ob_allowances")
        .insert(allowance)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        allowance: data,
      });
    }

    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
      });
    }

    const employees = await loadEmployees(supabase);

    const q = String(req.query.q || "").trim().toLowerCase();
    const status = String(req.query.status || "").trim();
    const type = String(req.query.type || "").trim();
    const employeeId = String(req.query.employee_id || "").trim();

    let query = supabase
      .from("payroll_ob_allowances")
      .select("*")
      .order("work_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);

    if (status) query = query.eq("status", status);
    if (type) query = query.eq("allowance_type", type);
    if (employeeId) query = query.eq("employee_id", employeeId);

    const { data, error } = await query;

    if (error) {
      if (isMissingTableError(error)) {
        return res.status(200).json({
          ok: true,
          needsSetup: true,
          employees,
          allowances: [],
          summary: buildSummary([]),
        });
      }

      throw error;
    }

    let allowances = data || [];

    if (q) {
      allowances = allowances.filter((row: any) => {
        const employee = employees.find((item: any) => item.id === row.employee_id);
        const haystack = [
          row.allowance_type,
          row.status,
          row.title,
          row.notes,
          employee?.first_name,
          employee?.last_name,
          employee?.email,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      });
    }

    return res.status(200).json({
      ok: true,
      needsSetup: false,
      employees,
      allowances,
      summary: buildSummary(allowances),
    });
  } catch (error: any) {
    console.error("/api/admin/lon/ob-tillagg error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera OB/tillägg.",
    });
  }
}
