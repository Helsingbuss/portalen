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
  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({ ok: false, error: "Schema-ID saknas." });
  }

  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const { data: schedule, error: scheduleError } = await supabase
        .from("staff_schedules")
        .select("*")
        .eq("id", id)
        .single();

      if (scheduleError) throw scheduleError;

      const { data: employees, error: employeesError } = await supabase
        .from("staff_employees")
        .select("*")
        .order("first_name", { ascending: true })
        .order("last_name", { ascending: true });

      if (employeesError) throw employeesError;

      return res.status(200).json({
        ok: true,
        schedule,
        employees: employees || [],
      });
    }

    if (req.method === "PUT") {
      const updateData = buildScheduleData(req.body || {});

      if (!updateData.employee_id) {
        return res.status(400).json({
          ok: false,
          error: "Personal/chaufför saknas.",
        });
      }

      if (!updateData.schedule_date) {
        return res.status(400).json({
          ok: false,
          error: "Datum saknas.",
        });
      }

      const { data, error } = await supabase
        .from("staff_schedules")
        .update(updateData)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        schedule: data,
      });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (error: any) {
    console.error("/api/admin/personal/schema/[id] error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera schemapasset.",
    });
  }
}
