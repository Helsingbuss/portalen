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

function calculateAmount(
  type: string,
  basisAmount: number,
  ratePercent: number,
  quantity: number,
  unitRate: number,
  amount: number
) {
  if (type === "commission_percent") {
    return (basisAmount * ratePercent) / 100;
  }

  if (type === "commission_per_booking") {
    return quantity * unitRate;
  }

  return amount;
}

function buildBonus(body: any) {
  const bonusType = cleanText(body.bonus_type) || "bonus";
  const basisAmount = cleanNumber(body.basis_amount, 0);
  const ratePercent = cleanNumber(body.rate_percent, 0);
  const quantity = cleanNumber(body.quantity, 0);
  const unitRate = cleanNumber(body.unit_rate, 0);
  const manualAmount = cleanNumber(body.amount, 0);

  const amount = calculateAmount(
    bonusType,
    basisAmount,
    ratePercent,
    quantity,
    unitRate,
    manualAmount
  );

  return {
    employee_id: cleanText(body.employee_id),
    bonus_type: bonusType,
    earning_date: cleanText(body.earning_date),
    period_start: cleanText(body.period_start),
    period_end: cleanText(body.period_end),

    basis_amount: basisAmount,
    rate_percent: ratePercent,
    quantity,
    unit_rate: unitRate,
    amount: Number(Number(amount || 0).toFixed(2)),

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requirePayrollAccess(req, res)) return;

  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({
      ok: false,
      error: "Bonus/provision-ID saknas.",
    });
  }

  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const { data: bonus, error: bonusError } = await supabase
        .from("payroll_bonus_commissions")
        .select("*")
        .eq("id", id)
        .single();

      if (bonusError) throw bonusError;

      const employees = await loadEmployees(supabase);

      return res.status(200).json({
        ok: true,
        bonus,
        employees,
      });
    }

    if (req.method === "PUT") {
      const updateData = buildBonus(req.body || {});

      if (!updateData.employee_id) {
        return res.status(400).json({
          ok: false,
          error: "Anställd saknas.",
        });
      }

      if (!updateData.earning_date) {
        return res.status(400).json({
          ok: false,
          error: "Datum saknas.",
        });
      }

      const { data, error } = await supabase
        .from("payroll_bonus_commissions")
        .update(updateData)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        bonus: data,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (error: any) {
    console.error("/api/admin/lon/bonus-provision/[id] error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera bonus/provision.",
    });
  }
}
