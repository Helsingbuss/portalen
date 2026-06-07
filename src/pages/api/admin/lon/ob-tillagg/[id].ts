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

function cleanBoolean(value: any, fallback = true) {
  if (value === true || value === "true" || value === "1" || value === 1) return true;
  if (value === false || value === "false" || value === "0" || value === 0) return false;
  return fallback;
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({
      ok: false,
      error: "OB/tillägg-ID saknas.",
    });
  }

  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const { data: allowance, error: allowanceError } = await supabase
        .from("payroll_ob_allowances")
        .select("*")
        .eq("id", id)
        .single();

      if (allowanceError) throw allowanceError;

      const employees = await loadEmployees(supabase);

      return res.status(200).json({
        ok: true,
        allowance,
        employees,
      });
    }

    if (req.method === "PUT") {
      const updateData = buildAllowance(req.body || {});

      if (!updateData.employee_id) {
        return res.status(400).json({
          ok: false,
          error: "Anställd saknas.",
        });
      }

      if (!updateData.work_date) {
        return res.status(400).json({
          ok: false,
          error: "Datum saknas.",
        });
      }

      const { data, error } = await supabase
        .from("payroll_ob_allowances")
        .update(updateData)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        allowance: data,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (error: any) {
    console.error("/api/admin/lon/ob-tillagg/[id] error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera OB/tillägg.",
    });
  }
}
