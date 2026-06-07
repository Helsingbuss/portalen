import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { requirePayrollAccess } from "@/lib/payrollAccess";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) throw new Error("Supabase env saknas.");
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function cleanText(value: any) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function cleanNumber(value: any, fallback: number | null = null) {
  if (value === "" || value === null || value === undefined) return fallback;
  const normalized = String(value).replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : fallback;
}

function cleanBoolean(value: any, fallback = false) {
  if (value === true || value === "true" || value === "1" || value === 1) return true;
  if (value === false || value === "false" || value === "0" || value === 0) return false;
  return fallback;
}

function buildProfile(body: any) {
  return {
    employee_id: cleanText(body.employee_id),
    tax_method: cleanText(body.tax_method) || "manual_percent",
    tax_table_number: cleanText(body.tax_table_number),
    tax_column: cleanText(body.tax_column),
    preliminary_tax_percent: cleanNumber(body.preliminary_tax_percent, 30),
    fixed_tax_amount: cleanNumber(body.fixed_tax_amount, 0),
    extra_tax_amount: cleanNumber(body.extra_tax_amount, 0),
    municipality: cleanText(body.municipality),
    is_main_employer: cleanBoolean(body.is_main_employer, true),
    decision_reference: cleanText(body.decision_reference),
    valid_from: cleanText(body.valid_from),
    valid_to: cleanText(body.valid_to),
    is_active: body.is_active === undefined ? true : cleanBoolean(body.is_active, true),
    notes: cleanText(body.notes),
    updated_at: new Date().toISOString(),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requirePayrollAccess(req, res)) return;

  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({ ok: false, error: "Skatteprofil-ID saknas." });
  }

  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const { data: profile, error: profileError } = await supabase
        .from("payroll_employee_tax_profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (profileError) throw profileError;

      const { data: employees, error: employeesError } = await supabase
        .from("staff_employees")
        .select("*")
        .order("first_name", { ascending: true })
        .order("last_name", { ascending: true });

      if (employeesError) throw employeesError;

      return res.status(200).json({
        ok: true,
        profile,
        employees: employees || [],
      });
    }

    if (req.method === "PUT") {
      const updateData = buildProfile(req.body || {});

      if (!updateData.employee_id) {
        return res.status(400).json({ ok: false, error: "Anställd saknas." });
      }

      const { data, error } = await supabase
        .from("payroll_employee_tax_profiles")
        .update(updateData)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(200).json({ ok: true, profile: data });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (error: any) {
    console.error("/api/admin/lon/skatteprofiler/[id] error", error);
    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera skatteprofilen.",
    });
  }
}
