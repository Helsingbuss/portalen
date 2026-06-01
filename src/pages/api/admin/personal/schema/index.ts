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
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function buildScheduleData(body: any) {
  return {
    employee_id: cleanText(body.employee_id),
    schedule_date: cleanText(body.schedule_date),
    start_time: cleanText(body.start_time),
    end_time: cleanText(body.end_time),
    shift_type: cleanText(body.shift_type) || "work",
    status: cleanText(body.status) || "available",
    location: cleanText(body.location),
    related_assignment: cleanText(body.related_assignment),
    break_minutes: cleanNumber(body.break_minutes),
    notes: cleanText(body.notes),
    updated_at: new Date().toISOString(),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (req.method === "POST") {
      const insertData = buildScheduleData(req.body || {});

      if (!insertData.employee_id) {
        return res.status(400).json({
          ok: false,
          error: "Personal/chaufför saknas.",
        });
      }

      if (!insertData.schedule_date) {
        return res.status(400).json({
          ok: false,
          error: "Datum saknas.",
        });
      }

      const { data, error } = await supabase
        .from("staff_schedules")
        .insert(insertData)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        schedule: data,
      });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const q = String(req.query.q || "").trim().toLowerCase();
    const status = String(req.query.status || "").trim();
    const shiftType = String(req.query.shift_type || "").trim();
    const employeeId = String(req.query.employee_id || "").trim();
    const dateFrom = String(req.query.date_from || "").trim();
    const dateTo = String(req.query.date_to || "").trim();

    const { data: employeesData, error: employeesError } = await supabase
      .from("staff_employees")
      .select("*")
      .order("first_name", { ascending: true })
      .order("last_name", { ascending: true });

    if (employeesError) throw employeesError;

    let schedulesQuery = supabase
      .from("staff_schedules")
      .select("*")
      .order("schedule_date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(800);

    if (status) schedulesQuery = schedulesQuery.eq("status", status);
    if (shiftType) schedulesQuery = schedulesQuery.eq("shift_type", shiftType);
    if (employeeId) schedulesQuery = schedulesQuery.eq("employee_id", employeeId);
    if (dateFrom) schedulesQuery = schedulesQuery.gte("schedule_date", dateFrom);
    if (dateTo) schedulesQuery = schedulesQuery.lte("schedule_date", dateTo);

    const { data: schedulesData, error: schedulesError } = await schedulesQuery;

    if (schedulesError) {
      if (isMissingTableError(schedulesError)) {
        return res.status(200).json({
          ok: true,
          needsSetup: true,
          employees: employeesData || [],
          schedules: [],
          summary: {
            total: 0,
            available: 0,
            booked: 0,
            dayOff: 0,
            sick: 0,
            vacation: 0,
          },
        });
      }

      throw schedulesError;
    }

    const employees = employeesData || [];
    let schedules = schedulesData || [];

    if (q) {
      schedules = schedules.filter((row: any) => {
        const employee = employees.find((item: any) => item.id === row.employee_id);

        const haystack = [
          row.schedule_date,
          row.start_time,
          row.end_time,
          row.shift_type,
          row.status,
          row.location,
          row.related_assignment,
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
      total: schedules.length,
      available: schedules.filter((row: any) => row.status === "available").length,
      booked: schedules.filter((row: any) => row.status === "booked").length,
      dayOff: schedules.filter((row: any) => row.status === "day_off").length,
      sick: schedules.filter((row: any) => row.status === "sick").length,
      vacation: schedules.filter((row: any) => row.status === "vacation").length,
    };

    return res.status(200).json({
      ok: true,
      needsSetup: false,
      employees,
      schedules,
      summary,
    });
  } catch (error: any) {
    console.error("/api/admin/personal/schema error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera schema.",
    });
  }
}
