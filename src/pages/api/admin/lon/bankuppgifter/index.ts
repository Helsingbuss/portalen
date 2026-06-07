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
  try {
    const supabase = getSupabase();

    if (req.method === "POST") {
      const insertData = buildBankData(req.body || {});

      if (!insertData.employee_id) {
        return res.status(400).json({
          ok: false,
          error: "Anställd saknas.",
        });
      }

      if (!insertData.recipient_name) {
        return res.status(400).json({
          ok: false,
          error: "Mottagarnamn saknas.",
        });
      }

      if (!insertData.clearing_number && !insertData.iban) {
        return res.status(400).json({
          ok: false,
          error: "Clearingnummer eller IBAN behövs.",
        });
      }

      if (!insertData.account_number && !insertData.iban) {
        return res.status(400).json({
          ok: false,
          error: "Kontonummer eller IBAN behövs.",
        });
      }

      const { data, error } = await supabase
        .from("payroll_employee_bank_details")
        .insert(insertData)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        bankDetail: data,
      });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const q = String(req.query.q || "").trim().toLowerCase();
    const active = String(req.query.active || "").trim();

    const employees = await loadEmployees(supabase);

    let query = supabase
      .from("payroll_employee_bank_details")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (active === "true") query = query.eq("is_active", true);
    if (active === "false") query = query.eq("is_active", false);

    const { data, error } = await query;

    if (error) {
      if (isMissingTableError(error)) {
        return res.status(200).json({
          ok: true,
          needsSetup: true,
          employees,
          bankDetails: [],
          summary: {
            total: 0,
            active: 0,
            missing: employees.length,
            app: 0,
            email: 0,
            kivra: 0,
          },
        });
      }

      throw error;
    }

    let bankDetails = data || [];

    if (q) {
      bankDetails = bankDetails.filter((row: any) => {
        const employee = employees.find((item: any) => item.id === row.employee_id);

        const haystack = [
          row.recipient_name,
          row.bank_name,
          row.clearing_number,
          row.account_number,
          row.iban,
          row.bic,
          row.payslip_email,
          row.notes,
          employee?.first_name,
          employee?.last_name,
          employee?.email,
          employee?.phone,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      });
    }

    const activeDetails = bankDetails.filter((row: any) => row.is_active);
    const employeesWithActiveDetails = new Set(activeDetails.map((row: any) => row.employee_id));

    const summary = {
      total: bankDetails.length,
      active: activeDetails.length,
      missing: employees.filter((employee: any) => !employeesWithActiveDetails.has(employee.id)).length,
      app: bankDetails.filter((row: any) => row.delivery_app_enabled).length,
      email: bankDetails.filter((row: any) => row.delivery_email_enabled).length,
      kivra: bankDetails.filter((row: any) => row.delivery_kivra_enabled).length,
    };

    return res.status(200).json({
      ok: true,
      needsSetup: false,
      employees,
      bankDetails,
      summary,
    });
  } catch (error: any) {
    console.error("/api/admin/lon/bankuppgifter error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera bankuppgifter.",
    });
  }
}
