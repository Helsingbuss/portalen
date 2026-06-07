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

function cleanNumber(value: any) {
  if (value === "" || value === null || value === undefined) return null;
  const normalized = String(value).replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function cleanBoolean(value: any) {
  if (value === true || value === "true" || value === "1" || value === 1) return true;
  if (value === false || value === "false" || value === "0" || value === 0) return false;
  return false;
}

function buildRateData(body: any) {
  return {
    employee_id: cleanText(body.employee_id),
    pay_type: cleanText(body.pay_type) || "hourly",
    hourly_rate: cleanNumber(body.hourly_rate),
    monthly_salary: cleanNumber(body.monthly_salary),
    standard_hours_per_month: cleanNumber(body.standard_hours_per_month),
    vacation_pay_percent: cleanNumber(body.vacation_pay_percent),
    effective_from: cleanText(body.effective_from),
    effective_to: cleanText(body.effective_to),
    is_active: body.is_active === undefined ? true : cleanBoolean(body.is_active),
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

  return (data || []) as any[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (req.method === "POST") {
      const insertData = buildRateData(req.body || {});

      if (!insertData.employee_id) {
        return res.status(400).json({
          ok: false,
          error: "Anställd saknas.",
        });
      }

      if (!insertData.effective_from) {
        return res.status(400).json({
          ok: false,
          error: "Gäller från-datum saknas.",
        });
      }

      if (insertData.pay_type === "hourly" && !insertData.hourly_rate) {
        return res.status(400).json({
          ok: false,
          error: "Timlön saknas.",
        });
      }

      if (insertData.pay_type === "monthly" && !insertData.monthly_salary) {
        return res.status(400).json({
          ok: false,
          error: "Månadslön saknas.",
        });
      }

      const { data, error } = await supabase
        .from("payroll_employee_rates")
        .insert(insertData)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        rate: data,
      });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const q = String(req.query.q || "").trim().toLowerCase();
    const payType = String(req.query.pay_type || "").trim();
    const active = String(req.query.active || "").trim();

    const employees = await loadEmployees(supabase);

    let query = supabase
      .from("payroll_employee_rates")
      .select("*")
      .order("effective_from", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);

    if (payType) query = query.eq("pay_type", payType);
    if (active === "true") query = query.eq("is_active", true);
    if (active === "false") query = query.eq("is_active", false);

    const { data, error } = await query;

    if (error) {
      if (isMissingTableError(error)) {
        return res.status(200).json({
          ok: true,
          needsSetup: true,
          employees,
          rates: [],
          summary: {
            total: 0,
            active: 0,
            hourly: 0,
            monthly: 0,
            inactive: 0,
          },
        });
      }

      throw error;
    }

    let rates = (data || []) as any[];

    if (q) {
      rates = rates.filter((row: any) => {
        const employee = employees.find((item: any) => item.id === row.employee_id);

        const haystack = [
          row.pay_type,
          row.hourly_rate,
          row.monthly_salary,
          row.effective_from,
          row.effective_to,
          row.notes,
          employee?.first_name,
          employee?.last_name,
          employee?.email,
          employee?.phone,
          employee?.role,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      });
    }

    const summary = {
      total: rates.length,
      active: rates.filter((row: any) => row.is_active).length,
      hourly: rates.filter((row: any) => row.pay_type === "hourly").length,
      monthly: rates.filter((row: any) => row.pay_type === "monthly").length,
      inactive: rates.filter((row: any) => !row.is_active).length,
    };

    return res.status(200).json({
      ok: true,
      needsSetup: false,
      employees,
      rates,
      summary,
    });
  } catch (error: any) {
    console.error("/api/admin/lon/lonesatser error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera lönesatser.",
    });
  }
}
