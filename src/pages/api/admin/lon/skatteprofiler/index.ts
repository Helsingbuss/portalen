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

function isMissingTableError(error: any) {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();
  return code === "42p01" || code === "pgrst205" || message.includes("does not exist") || message.includes("could not find the table") || message.includes("schema cache");
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
  if (!requirePayrollAccess(req, res)) return;

  try {
    const supabase = getSupabase();

    if (req.method === "POST") {
      const profile = buildProfile(req.body || {});

      if (!profile.employee_id) {
        return res.status(400).json({ ok: false, error: "Anställd saknas." });
      }

      const { data, error } = await supabase
        .from("payroll_employee_tax_profiles")
        .insert(profile)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(201).json({ ok: true, profile: data });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const q = String(req.query.q || "").trim().toLowerCase();
    const active = String(req.query.active || "").trim();

    const employees = await loadEmployees(supabase);

    let query = supabase
      .from("payroll_employee_tax_profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (active === "true") query = query.eq("is_active", true);
    if (active === "false") query = query.eq("is_active", false);

    const { data, error } = await query;

    if (error) {
      if (isMissingTableError(error)) {
        return res.status(200).json({
          ok: true,
          needsSetup: true,
          employees,
          profiles: [],
          summary: {
            total: 0,
            active: 0,
            missing: employees.length,
            table: 0,
            sideIncome: 0,
            decision: 0,
            manual: 0,
          },
        });
      }
      throw error;
    }

    let profiles = data || [];

    if (q) {
      profiles = profiles.filter((row: any) => {
        const employee = employees.find((item: any) => item.id === row.employee_id);
        const haystack = [
          row.tax_method,
          row.tax_table_number,
          row.tax_column,
          row.municipality,
          row.decision_reference,
          row.notes,
          employee?.first_name,
          employee?.last_name,
          employee?.email,
        ].filter(Boolean).join(" ").toLowerCase();

        return haystack.includes(q);
      });
    }

    const activeProfiles = profiles.filter((row: any) => row.is_active);
    const employeesWithProfile = new Set(activeProfiles.map((row: any) => row.employee_id));

    const summary = {
      total: profiles.length,
      active: activeProfiles.length,
      missing: employees.filter((employee: any) => !employeesWithProfile.has(employee.id)).length,
      table: profiles.filter((row: any) => row.tax_method === "table").length,
      sideIncome: profiles.filter((row: any) => row.tax_method === "side_income_30").length,
      decision: profiles.filter((row: any) => row.tax_method === "decision").length,
      manual: profiles.filter((row: any) => row.tax_method === "manual_percent").length,
    };

    return res.status(200).json({
      ok: true,
      needsSetup: false,
      employees,
      profiles,
      summary,
    });
  } catch (error: any) {
    console.error("/api/admin/lon/skatteprofiler error", error);
    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera skatteprofiler.",
    });
  }
}
