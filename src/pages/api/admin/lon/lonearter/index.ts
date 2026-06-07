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

function cleanBoolean(value: any) {
  if (value === true || value === "true" || value === "1" || value === 1) return true;
  if (value === false || value === "false" || value === "0" || value === 0) return false;
  return false;
}

function buildPayItemData(body: any) {
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
  try {
    const supabase = getSupabase();

    if (req.method === "POST") {
      const insertData = buildPayItemData(req.body || {});

      if (!insertData.code) {
        return res.status(400).json({
          ok: false,
          error: "Kod saknas.",
        });
      }

      if (!insertData.name) {
        return res.status(400).json({
          ok: false,
          error: "Namn saknas.",
        });
      }

      const { data, error } = await supabase
        .from("payroll_pay_items")
        .insert(insertData)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        payItem: data,
      });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const q = String(req.query.q || "").trim().toLowerCase();
    const category = String(req.query.category || "").trim();
    const active = String(req.query.active || "").trim();

    let query = supabase
      .from("payroll_pay_items")
      .select("*")
      .order("category", { ascending: true })
      .order("code", { ascending: true })
      .limit(500);

    if (category) query = query.eq("category", category);
    if (active === "true") query = query.eq("is_active", true);
    if (active === "false") query = query.eq("is_active", false);

    const { data, error } = await query;

    if (error) {
      if (isMissingTableError(error)) {
        return res.status(200).json({
          ok: true,
          needsSetup: true,
          payItems: [],
          summary: {
            total: 0,
            active: 0,
            ob: 0,
            allowance: 0,
            bonus: 0,
            deduction: 0,
          },
        });
      }

      throw error;
    }

    let payItems = data || [];

    if (q) {
      payItems = payItems.filter((row: any) => {
        const haystack = [
          row.code,
          row.name,
          row.category,
          row.calculation_type,
          row.unit,
          row.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      });
    }

    const summary = {
      total: payItems.length,
      active: payItems.filter((row: any) => row.is_active).length,
      ob: payItems.filter((row: any) => row.category === "ob").length,
      allowance: payItems.filter((row: any) => row.category === "allowance").length,
      bonus: payItems.filter((row: any) => row.category === "bonus").length,
      deduction: payItems.filter((row: any) => row.category === "deduction").length,
    };

    return res.status(200).json({
      ok: true,
      needsSetup: false,
      payItems,
      summary,
    });
  } catch (error: any) {
    console.error("/api/admin/lon/lonearter error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera lönearter.",
    });
  }
}
