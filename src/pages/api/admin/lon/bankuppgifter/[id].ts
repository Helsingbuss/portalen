import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { requirePayrollAccess } from "@/lib/payrollAccess";

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

function cleanBoolean(value: any) {
  if (value === true || value === "true" || value === "1" || value === 1) return true;
  if (value === false || value === "false" || value === "0" || value === 0) return false;
  return false;
}

function buildBankData(body: any) {
  return {
    employee_id: cleanText(body.employee_id),
    recipient_name: cleanText(body.recipient_name),
    bank_name: cleanText(body.bank_name),
    clearing_number: cleanText(body.clearing_number),
    account_number: cleanText(body.account_number),
    iban: cleanText(body.iban),
    bic: cleanText(body.bic),
    payslip_email: cleanText(body.payslip_email),
    delivery_app_enabled: cleanBoolean(body.delivery_app_enabled),
    delivery_email_enabled: cleanBoolean(body.delivery_email_enabled),
    delivery_kivra_enabled: cleanBoolean(body.delivery_kivra_enabled),
    kivra_identifier: cleanText(body.kivra_identifier),
    is_active: body.is_active === undefined ? true : cleanBoolean(body.is_active),
    notes: cleanText(body.notes),
    updated_at: new Date().toISOString(),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requirePayrollAccess(req, res)) return;

  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({ ok: false, error: "Bankuppgift-ID saknas." });
  }

  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const { data: bankDetail, error: bankError } = await supabase
        .from("payroll_employee_bank_details")
        .select("*")
        .eq("id", id)
        .single();

      if (bankError) throw bankError;

      const { data: employees, error: employeesError } = await supabase
        .from("staff_employees")
        .select("*")
        .order("first_name", { ascending: true })
        .order("last_name", { ascending: true });

      if (employeesError) throw employeesError;

      return res.status(200).json({
        ok: true,
        bankDetail,
        employees: employees || [],
      });
    }

    if (req.method === "PUT") {
      const updateData = buildBankData(req.body || {});

      if (!updateData.employee_id) {
        return res.status(400).json({
          ok: false,
          error: "Anställd saknas.",
        });
      }

      if (!updateData.recipient_name) {
        return res.status(400).json({
          ok: false,
          error: "Mottagarnamn saknas.",
        });
      }

      const { data, error } = await supabase
        .from("payroll_employee_bank_details")
        .update(updateData)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        bankDetail: data,
      });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (error: any) {
    console.error("/api/admin/lon/bankuppgifter/[id] error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera bankuppgiften.",
    });
  }
}
