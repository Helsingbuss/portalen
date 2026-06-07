import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { getBearerToken, verifyPersonalToken } from "@/lib/personalAuth";

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({
      ok: false,
      error: "Lönebesked-ID saknas.",
    });
  }

  try {
    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
      });
    }

    const token = getBearerToken(req);
    const payload = verifyPersonalToken(token);

    if (!payload) {
      return res.status(401).json({
        ok: false,
        error: "Du är inte inloggad.",
      });
    }

    const supabase = getSupabase();

    const { data: employee, error: employeeError } = await supabase
      .from("staff_employees")
      .select("*")
      .eq("id", payload.employee_id)
      .maybeSingle();

    if (employeeError) throw employeeError;

    if (!employee) {
      return res.status(401).json({
        ok: false,
        error: "Kunde inte hitta personalprofil.",
      });
    }

    const { data: payslip, error: payslipError } = await supabase
      .from("payroll_run_rows")
      .select("*")
      .eq("id", id)
      .eq("employee_id", employee.id)
      .eq("app_published", true)
      .single();

    if (payslipError) throw payslipError;

    let run = null;

    if (payslip?.payroll_run_id) {
      const { data: runData, error: runError } = await supabase
        .from("payroll_runs")
        .select("*")
        .eq("id", payslip.payroll_run_id)
        .single();

      if (runError) throw runError;
      run = runData;
    }

    return res.status(200).json({
      ok: true,
      employee: {
        id: employee.id,
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email,
        role: employee.role,
      },
      payslip,
      run,
    });
  } catch (error: any) {
    console.error("/api/personal/lonebesked/[id] error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hämta lönebeskedet.",
    });
  }
}
