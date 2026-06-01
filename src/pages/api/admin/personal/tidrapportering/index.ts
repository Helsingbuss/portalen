import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase env saknas. Admin kräver SUPABASE_SERVICE_ROLE_KEY eller SUPABASE_SERVICE_KEY i .env.local."
    );
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

function timeToMinutes(value: any) {
  const text = String(value || "").trim();
  const parts = text.split(":");
  if (parts.length < 2) return null;

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

  return hours * 60 + minutes;
}

function calculateTotalHours(startTime: any, endTime: any, breakMinutesInput: any) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const breakMinutes = cleanNumber(breakMinutesInput) || 0;

  if (start === null || end === null) return null;

  let diff = end - start;

  if (diff < 0) {
    diff += 24 * 60;
  }

  const workedMinutes = Math.max(diff - breakMinutes, 0);

  return Number((workedMinutes / 60).toFixed(2));
}

function buildTimeReportData(body: any) {
  const totalHours =
    cleanNumber(body.total_hours) ??
    calculateTotalHours(body.start_time, body.end_time, body.break_minutes);

  return {
    employee_id: cleanText(body.employee_id),
    schedule_id: cleanText(body.schedule_id),
    report_date: cleanText(body.report_date),
    start_time: cleanText(body.start_time),
    end_time: cleanText(body.end_time),
    break_minutes: cleanNumber(body.break_minutes),
    total_hours: totalHours,

    work_type: cleanText(body.work_type) || "driving",
    status: cleanText(body.status) || "draft",

    related_assignment: cleanText(body.related_assignment),
    km_start: cleanNumber(body.km_start),
    km_end: cleanNumber(body.km_end),

    deviation: cleanText(body.deviation),
    notes: cleanText(body.notes),

    updated_at: new Date().toISOString(),
  };
}

async function loadEmployeesAndSchedules(supabase: any) {
  const { data: employees, error: employeesError } = await supabase
    .from("staff_employees")
    .select("*")
    .order("first_name", { ascending: true })
    .order("last_name", { ascending: true });

  if (employeesError) throw employeesError;

  const { data: schedules, error: schedulesError } = await supabase
    .from("staff_schedules")
    .select("*")
    .order("schedule_date", { ascending: false })
    .order("start_time", { ascending: true })
    .limit(300);

  if (schedulesError && !isMissingTableError(schedulesError)) {
    throw schedulesError;
  }

  return {
    employees: (employees || []) as any[],
    schedules: (schedules || []) as any[],
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (req.method === "POST") {
      const insertData = buildTimeReportData(req.body || {});

      if (!insertData.employee_id) {
        return res.status(400).json({
          ok: false,
          error: "Personal/chaufför saknas.",
        });
      }

      if (!insertData.report_date) {
        return res.status(400).json({
          ok: false,
          error: "Datum saknas.",
        });
      }

      const { data, error } = await supabase
        .from("staff_time_reports")
        .insert(insertData)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        report: data,
      });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const q = String(req.query.q || "").trim().toLowerCase();
    const status = String(req.query.status || "").trim();
    const workType = String(req.query.work_type || "").trim();
    const employeeId = String(req.query.employee_id || "").trim();
    const dateFrom = String(req.query.date_from || "").trim();
    const dateTo = String(req.query.date_to || "").trim();

    const { employees, schedules } = (await loadEmployeesAndSchedules(supabase)) as { employees: any[]; schedules: any[] };

    let reportsQuery = supabase
      .from("staff_time_reports")
      .select("*")
      .order("report_date", { ascending: false })
      .order("start_time", { ascending: false })
      .limit(800);

    if (status) reportsQuery = reportsQuery.eq("status", status);
    if (workType) reportsQuery = reportsQuery.eq("work_type", workType);
    if (employeeId) reportsQuery = reportsQuery.eq("employee_id", employeeId);
    if (dateFrom) reportsQuery = reportsQuery.gte("report_date", dateFrom);
    if (dateTo) reportsQuery = reportsQuery.lte("report_date", dateTo);

    const { data: reportsData, error: reportsError } = await reportsQuery;

    if (reportsError) {
      if (isMissingTableError(reportsError)) {
        return res.status(200).json({
          ok: true,
          needsSetup: true,
          employees,
          schedules,
          reports: [],
          summary: {
            total: 0,
            draft: 0,
            submitted: 0,
            approved: 0,
            rejected: 0,
            totalHours: 0,
          },
        });
      }

      throw reportsError;
    }

    let reports = reportsData || [];

    if (q) {
      reports = reports.filter((row: any) => {
        const employee = employees.find((item: any) => item.id === row.employee_id);
        const schedule = schedules.find((item: any) => item.id === row.schedule_id);

        const haystack = [
          row.report_date,
          row.start_time,
          row.end_time,
          row.work_type,
          row.status,
          row.related_assignment,
          row.deviation,
          row.notes,
          employee?.first_name,
          employee?.last_name,
          employee?.email,
          employee?.phone,
          schedule?.location,
          schedule?.related_assignment,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      });
    }

    const summary = {
      total: reports.length,
      draft: reports.filter((row: any) => row.status === "draft").length,
      submitted: reports.filter((row: any) => row.status === "submitted").length,
      approved: reports.filter((row: any) => row.status === "approved").length,
      rejected: reports.filter((row: any) => row.status === "rejected").length,
      totalHours: Number(
        reports
          .reduce((sum: number, row: any) => sum + Number(row.total_hours || 0), 0)
          .toFixed(2)
      ),
    };

    return res.status(200).json({
      ok: true,
      needsSetup: false,
      employees,
      schedules,
      reports,
      summary,
    });
  } catch (error: any) {
    console.error("/api/admin/personal/tidrapportering error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera tidrapportering.",
    });
  }
}
