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
    auth: { persistSession: false, autoRefreshToken: false },
  });
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

function cleanBoolean(value: any) {
  return value === true || value === "true" || value === "1" || value === 1;
}

function buildData(body: any) {
  return {
    code: cleanText(body.code),
    name: cleanText(body.name),
    category: cleanText(body.category) || "base_salary",
    calculation_type: cleanText(body.calculation_type) || "fixed_amount",
    amount: cleanNumber(body.amount),
    percent: cleanNumber(body.percent),
    unit: cleanText(body.unit) || "hour",
    taxable: cleanBoolean(body.taxable),
    pensionable: cleanBoolean(body.pensionable),
    affects_vacation_pay: cleanBoolean(body.affects_vacation_pay),
    is_active: body.is_active === undefined ? true : cleanBoolean(body.is_active),
    notes: cleanText(body.notes),
    updated_at: new Date().toISOString(),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requirePayrollAccess(req, res)) return;

  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({ ok: false, error: "Löneart-ID saknas." });
  }

  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("payroll_pay_items")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      return res.status(200).json({ ok: true, payItem: data });
    }

    if (req.method === "PUT") {
      const updateData = buildData(req.body || {});

      if (!updateData.code) {
        return res.status(400).json({ ok: false, error: "Kod saknas." });
      }

      if (!updateData.name) {
        return res.status(400).json({ ok: false, error: "Namn saknas." });
      }

      const { data, error } = await supabase
        .from("payroll_pay_items")
        .update(updateData)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(200).json({ ok: true, payItem: data });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (error: any) {
    console.error("/api/admin/lon/lonearter/[id] error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera lönearten.",
    });
  }
}
