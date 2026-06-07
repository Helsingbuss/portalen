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

function buildPerDiem(body: any) {
  const days = cleanNumber(body.days, 1);
  const rate = cleanNumber(body.rate, 0);
  const manualAmount = cleanNumber(body.amount, days * rate);
  const amount = manualAmount || days * rate;

  return {
    employee_id: cleanText(body.employee_id),
    per_diem_type: cleanText(body.per_diem_type) || "domestic_full_day",
    trip_start_date: cleanText(body.trip_start_date),
    trip_end_date: cleanText(body.trip_end_date) || cleanText(body.trip_start_date),
    destination: cleanText(body.destination),
    country: cleanText(body.country) || "Sverige",
    days,
    rate,
    amount: Number(Number(amount || 0).toFixed(2)),
    tax_free: cleanBoolean(body.tax_free, true),
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
      error: "Traktamente-ID saknas.",
    });
  }

  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const { data: perDiem, error: perDiemError } = await supabase
        .from("payroll_per_diems")
        .select("*")
        .eq("id", id)
        .single();

      if (perDiemError) throw perDiemError;

      const employees = await loadEmployees(supabase);

      return res.status(200).json({
        ok: true,
        perDiem,
        employees,
      });
    }

    if (req.method === "PUT") {
      const updateData = buildPerDiem(req.body || {});

      if (!updateData.employee_id) {
        return res.status(400).json({
          ok: false,
          error: "Anställd saknas.",
        });
      }

      if (!updateData.trip_start_date) {
        return res.status(400).json({
          ok: false,
          error: "Startdatum saknas.",
        });
      }

      const { data, error } = await supabase
        .from("payroll_per_diems")
        .update(updateData)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        perDiem: data,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (error: any) {
    console.error("/api/admin/lon/traktamente/[id] error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera traktamente.",
    });
  }
}
