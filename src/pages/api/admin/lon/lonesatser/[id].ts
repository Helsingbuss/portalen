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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({ ok: false, error: "Lönesats-ID saknas." });
  }

  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const { data: rate, error: rateError } = await supabase
        .from("payroll_employee_rates")
        .select("*")
        .eq("id", id)
        .single();

      if (rateError) throw rateError;

      const { data: employees, error: employeesError } = await supabase
        .from("staff_employees")
        .select("*")
        .order("first_name", { ascending: true })
        .order("last_name", { ascending: true });

      if (employeesError) throw employeesError;

      return res.status(200).json({
        ok: true,
        rate,
        employees: employees || [],
      });
    }

    if (req.method === "PUT") {
      const updateData = buildRateData(req.body || {});

      if (!updateData.employee_id) {
        return res.status(400).json({
          ok: false,
          error: "Anställd saknas.",
        });
      }

      if (!updateData.effective_from) {
        return res.status(400).json({
          ok: false,
          error: "Gäller från-datum saknas.",
        });
      }

      if (updateData.pay_type === "hourly" && !updateData.hourly_rate) {
        return res.status(400).json({
          ok: false,
          error: "Timlön saknas.",
        });
      }

      if (updateData.pay_type === "monthly" && !updateData.monthly_salary) {
        return res.status(400).json({
          ok: false,
          error: "Månadslön saknas.",
        });
      }

      const { data, error } = await supabase
        .from("payroll_employee_rates")
        .update(updateData)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        rate: data,
      });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (error: any) {
    console.error("/api/admin/lon/lonesatser/[id] error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera lönesatsen.",
    });
  }
}
