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

function nextStatusFromAction(action: string) {
  switch (action) {
    case "submit":
      return "submitted";
    case "approve":
      return "approved";
    case "reject":
      return "rejected";
    case "draft":
      return "draft";
    default:
      return null;
  }
}

async function loadBaseData(supabase: any) {
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
    .limit(500);

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
      const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
      const action = String(req.body?.action || "").trim();
      const newStatus = nextStatusFromAction(action);
      const adminNote = cleanText(req.body?.admin_note);

      if (!ids.length) {
        return res.status(400).json({
          ok: false,
          error: "Inga tidrapporter valda.",
        });
      }

      if (!newStatus) {
        return res.status(400).json({
          ok: false,
          error: "Ogiltig åtgärd.",
        });
      }

      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (adminNote) {
        updateData.notes = adminNote;
      }

      const { data, error } = await supabase
        .from("staff_time_reports")
        .update(updateData)
        .in("id", ids)
        .select("*");

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        reports: data || [],
        updated: data?.length || 0,
        status: newStatus,
      });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const q = String(req.query.q || "").trim().toLowerCase();
    const status = String(req.query.status || "").trim();
    const employeeId = String(req.query.employee_id || "").trim();
    const dateFrom = String(req.query.date_from || "").trim();
    const dateTo = String(req.query.date_to || "").trim();

    const { employees, schedules } = await loadBaseData(supabase);

    let query = supabase
      .from("staff_time_reports")
      .select("*")
      .order("report_date", { ascending: false })
      .order("start_time", { ascending: false })
      .limit(1000);

    if (status) query = query.eq("status", status);
    if (employeeId) query = query.eq("employee_id", employeeId);
    if (dateFrom) query = query.gte("report_date", dateFrom);
    if (dateTo) query = query.lte("report_date", dateTo);

    const { data, error } = await query;

    if (error) {
      if (isMissingTableError(error)) {
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
            approvedHours: 0,
          },
        });
      }

      throw error;
    }

    let reports = (data || []) as any[];

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
      approvedHours: Number(
        reports
          .filter((row: any) => row.status === "approved")
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
    console.error("/api/admin/lon/godkann-tider error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera godkännande av tider.",
    });
  }
}
