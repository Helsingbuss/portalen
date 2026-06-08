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

function cleanBoolean(value: any, fallback = false) {
  if (value === true || value === "true" || value === "1" || value === 1) return true;
  if (value === false || value === "false" || value === "0" || value === 0) return false;
  return fallback;
}

function calculateAmounts(body: any) {
  const gross = cleanNumber(body.gross_amount ?? body.amount, 0);
  const vatPercent = cleanNumber(body.vat_percent, 0);
  const amountIncludesVat = cleanBoolean(body.amount_includes_vat, true);

  if (vatPercent <= 0) {
    return {
      gross_amount: gross,
      net_amount: gross,
      vat_amount: 0,
    };
  }

  if (amountIncludesVat) {
    const net = gross / (1 + vatPercent / 100);
    const vat = gross - net;

    return {
      gross_amount: Number(gross.toFixed(2)),
      net_amount: Number(net.toFixed(2)),
      vat_amount: Number(vat.toFixed(2)),
    };
  }

  const vat = gross * vatPercent / 100;
  const total = gross + vat;

  return {
    gross_amount: Number(total.toFixed(2)),
    net_amount: Number(gross.toFixed(2)),
    vat_amount: Number(vat.toFixed(2)),
  };
}

function buildTransaction(body: any) {
  const amounts = calculateAmounts(body);

  return {
    transaction_type: cleanText(body.transaction_type) || "income",
    transaction_date: cleanText(body.transaction_date),
    title: cleanText(body.title),
    description: cleanText(body.description),

    category: cleanText(body.category),
    customer_supplier_name: cleanText(body.customer_supplier_name),

    gross_amount: amounts.gross_amount,
    net_amount: amounts.net_amount,
    vat_amount: amounts.vat_amount,
    vat_percent: cleanNumber(body.vat_percent, 0),
    amount_includes_vat: cleanBoolean(body.amount_includes_vat, true),

    payment_method: cleanText(body.payment_method) || "bank_transfer",
    bank_account_id: cleanText(body.bank_account_id),
    reference: cleanText(body.reference),

    invoice_id: cleanText(body.invoice_id),
    booking_id: cleanText(body.booking_id),
    receipt_url: cleanText(body.receipt_url),

    accounting_account: cleanText(body.accounting_account),
    vat_account: cleanText(body.vat_account),

    status: cleanText(body.status) || "draft",
    notes: cleanText(body.notes),
    updated_at: new Date().toISOString(),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({
      ok: false,
      error: "Transaktions-ID saknas.",
    });
  }

  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("finance_transactions")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        transaction: data,
      });
    }

    if (req.method === "PUT") {
      const payload = buildTransaction(req.body || {});

      const { data, error } = await supabase
        .from("finance_transactions")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        transaction: data,
      });
    }

    if (req.method === "DELETE") {
      const { data, error } = await supabase
        .from("finance_transactions")
        .update({
          status: "archived",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        transaction: data,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/intakter-utgifter/[id] error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera transaktionen.",
    });
  }
}
