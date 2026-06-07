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

function buildAbsence(body: any) {
  return {
    employee_id: cleanText(body.employee_id),
    absence_type: cleanText(body.absence_type) || "sick",
    start_date: cleanText(body.start_date),
    end_date: cleanText(body.end_date) || cleanText(body.start_date),
    start_time: cleanText(body.start_time),
    end_time: cleanText(body.end_time),
    hours: cleanNumber(body.hours, 0),
    paid_percent: cleanNumber(body.paid_percent, 0),
    affects_payroll: cleanBoolean(body.affects_payroll, true),
    status: cleanText(body.status) || "draft",
    reason: cleanText(body.reason),
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

function buildSummary(absences: any[]) {
  return {
    total: absences.length,
    draft: absences.filter((row) => row.status === "draft").length,
    submitted: absences.filter((row) => row.status === "submitted").length,
    approved: absences.filter((row) => row.status === "approved").length,
    rejected: absences.filter((row) => row.status === "rejected").length,
    payrollRelevant: absences.filter((row) => row.affects_payroll).length,
    sick: absences.filter((row) => row.absence_type === "sick").length,
    vacation: absences.filter((row) => row.absence_type === "vacation").length,
    vab: absences.filter((row) => row.absence_type === "vab").length,
    totalHours: Number(absences.reduce((sum, row) => sum + Number(row.hours || 0), 0).toFixed(2)),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (req.method === "POST") {
      const absence = buildAbsence(req.body || {});

      if (!absence.employee_id) {
        return res.status(400).json({
          ok: false,
          error: "Anställd saknas.",
        });
      }

      if (!absence.start_date) {
        return res.status(400).json({
          ok: false,
          error: "Startdatum saknas.",
        });
      }

      const { data, error } = await supabase
        .from("payroll_absences")
        .insert(absence)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        absence: data,
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
      .from("payroll_absences")
      .select("*")
      .order("start_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);

    if (status) query = query.eq("status", status);
    if (type) query = query.eq("absence_type", type);
    if (employeeId) query = query.eq("employee_id", employeeId);

    const { data, error } = await query;

    if (error) {
      if (isMissingTableError(error)) {
        return res.status(200).json({
          ok: true,
          needsSetup: true,
          employees,
          absences: [],
          summary: buildSummary([]),
        });
      }

      throw error;
    }

    let absences = data || [];

    if (q) {
      absences = absences.filter((row: any) => {
        const employee = employees.find((item: any) => item.id === row.employee_id);
        const haystack = [
          row.absence_type,
          row.status,
          row.reason,
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
      absences,
      summary: buildSummary(absences),
    });
  } catch (error: any) {
    console.error("/api/admin/lon/franvaro error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera frånvaro.",
    });
  }
}
