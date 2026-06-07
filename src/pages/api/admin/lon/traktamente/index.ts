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

function buildSummary(rows: any[]) {
  return {
    total: rows.length,
    draft: rows.filter((row) => row.status === "draft").length,
    submitted: rows.filter((row) => row.status === "submitted").length,
    approved: rows.filter((row) => row.status === "approved").length,
    rejected: rows.filter((row) => row.status === "rejected").length,
    payrollRelevant: rows.filter((row) => row.affects_payroll).length,
    taxFree: rows.filter((row) => row.tax_free).length,
    fullDay: rows.filter((row) => row.per_diem_type === "domestic_full_day").length,
    halfDay: rows.filter((row) => row.per_diem_type === "domestic_half_day").length,
    night: rows.filter((row) => row.per_diem_type === "domestic_night").length,
    totalDays: Number(rows.reduce((sum, row) => sum + Number(row.days || 0), 0).toFixed(2)),
    totalAmount: Number(rows.reduce((sum, row) => sum + Number(row.amount || 0), 0).toFixed(2)),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (req.method === "POST") {
      const perDiem = buildPerDiem(req.body || {});

      if (!perDiem.employee_id) {
        return res.status(400).json({
          ok: false,
          error: "Anställd saknas.",
        });
      }

      if (!perDiem.trip_start_date) {
        return res.status(400).json({
          ok: false,
          error: "Startdatum saknas.",
        });
      }

      const { data, error } = await supabase
        .from("payroll_per_diems")
        .insert(perDiem)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        perDiem: data,
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
      .from("payroll_per_diems")
      .select("*")
      .order("trip_start_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);

    if (status) query = query.eq("status", status);
    if (type) query = query.eq("per_diem_type", type);
    if (employeeId) query = query.eq("employee_id", employeeId);

    const { data, error } = await query;

    if (error) {
      if (isMissingTableError(error)) {
        return res.status(200).json({
          ok: true,
          needsSetup: true,
          employees,
          perDiems: [],
          summary: buildSummary([]),
        });
      }

      throw error;
    }

    let perDiems = data || [];

    if (q) {
      perDiems = perDiems.filter((row: any) => {
        const employee = employees.find((item: any) => item.id === row.employee_id);
        const haystack = [
          row.per_diem_type,
          row.status,
          row.title,
          row.destination,
          row.country,
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
      perDiems,
      summary: buildSummary(perDiems),
    });
  } catch (error: any) {
    console.error("/api/admin/lon/traktamente error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera traktamente.",
    });
  }
}
