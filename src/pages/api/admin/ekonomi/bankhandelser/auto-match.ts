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

function n(value: any) {
  const num = Number(String(value ?? "0").replace(",", "."));
  return Number.isFinite(num) ? Number(num.toFixed(2)) : 0;
}

function absMoney(value: any) {
  return Math.abs(n(value));
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function cleanDigits(value: any) {
  return String(value || "").replace(/[^0-9]/g, "");
}

function haystack(row: any) {
  return [
    row.description,
    row.reference,
    row.raw_data ? JSON.stringify(row.raw_data) : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function amountMatches(bankAmount: number, invoiceAmount: number) {
  return Math.abs(absMoney(bankAmount) - absMoney(invoiceAmount)) < 0.01;
}

function textContains(text: string, value: any) {
  const raw = String(value || "").trim().toLowerCase();
  const digits = cleanDigits(value);

  if (!raw && !digits) return false;

  if (raw && text.includes(raw)) return true;
  if (digits && cleanDigits(text).includes(digits)) return true;

  return false;
}

function isPaid(status: any) {
  return String(status || "").toLowerCase() === "paid";
}

function isArchived(status: any) {
  return String(status || "").toLowerCase() === "archived";
}

function vatPercent(row: any) {
  const subtotal = n(row.subtotal_excl_vat);
  const vat = n(row.vat_amount);

  if (subtotal <= 0 || vat <= 0) return 0;

  return Number(((vat / subtotal) * 100).toFixed(2));
}

function customerScore(bankRow: any, invoice: any) {
  const text = haystack(bankRow);
  let score = 0;

  if (textContains(text, invoice.ocr_number)) score += 80;
  if (textContains(text, invoice.invoice_number)) score += 45;
  if (invoice.customer_name && text.includes(String(invoice.customer_name).toLowerCase())) score += 20;
  if (amountMatches(bankRow.amount, invoice.unpaid_amount || invoice.total_amount)) score += 80;

  if (n(bankRow.amount) <= 0) score -= 100;

  return score;
}

function supplierScore(bankRow: any, invoice: any) {
  const text = haystack(bankRow);
  let score = 0;

  if (textContains(text, invoice.ocr_number)) score += 80;
  if (textContains(text, invoice.supplier_invoice_number)) score += 45;
  if (invoice.supplier_name && text.includes(String(invoice.supplier_name).toLowerCase())) score += 20;
  if (amountMatches(bankRow.amount, invoice.unpaid_amount || invoice.total_amount)) score += 80;

  if (n(bankRow.amount) >= 0) score -= 100;

  return score;
}

async function upsertCustomerTransaction(supabase: any, invoice: any, bankRow: any) {
  const payload = {
    transaction_type: "income",
    transaction_date: bankRow.transaction_date || invoice.paid_date || today(),
    title: "Betald kundfaktura " + String(invoice.invoice_number || ""),
    description: "Automatiskt matchad mot bankhändelse.",
    category: invoice.category || "Kundfaktura",
    customer_supplier_name: invoice.customer_name,
    gross_amount: n(invoice.total_amount),
    net_amount: n(invoice.subtotal_excl_vat),
    vat_amount: n(invoice.vat_amount),
    vat_percent: vatPercent(invoice),
    amount_includes_vat: true,
    payment_method: "bank_import",
    bank_account_id: bankRow.bank_account_id || invoice.paid_bank_account_id || null,
    reference: bankRow.reference || invoice.ocr_number || invoice.invoice_number,
    invoice_id: invoice.id,
    accounting_account: "3010",
    vat_account: n(invoice.vat_amount) > 0 ? "2631" : null,
    status: "reconciled",
    notes: "Matchad från importerad bankhändelse.",
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("finance_transactions")
    .select("id")
    .eq("invoice_id", invoice.id)
    .eq("transaction_type", "income")
    .maybeSingle();

  if (existing?.id) {
    await supabase.from("finance_transactions").update(payload).eq("id", existing.id);
  } else {
    await supabase.from("finance_transactions").insert(payload);
  }
}

async function upsertSupplierTransaction(supabase: any, invoice: any, bankRow: any) {
  const payload = {
    transaction_type: "expense",
    transaction_date: bankRow.transaction_date || invoice.paid_date || today(),
    title: "Betald leverantörsfaktura " + String(invoice.supplier_invoice_number || ""),
    description: "Automatiskt matchad mot bankhändelse.",
    category: invoice.category || "Leverantörsfaktura",
    customer_supplier_name: invoice.supplier_name,
    gross_amount: n(invoice.total_amount),
    net_amount: n(invoice.subtotal_excl_vat),
    vat_amount: n(invoice.vat_amount),
    vat_percent: vatPercent(invoice),
    amount_includes_vat: true,
    payment_method: "bank_import",
    bank_account_id: bankRow.bank_account_id || invoice.paid_bank_account_id || null,
    reference: bankRow.reference || invoice.ocr_number || invoice.supplier_invoice_number,
    supplier_invoice_id: invoice.id,
    invoice_id: invoice.linked_customer_invoice_id || null,
    accounting_account: invoice.default_cost_account || "4010",
    vat_account: n(invoice.vat_amount) > 0 ? "2641" : null,
    status: "reconciled",
    notes: "Matchad från importerad bankhändelse.",
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("finance_transactions")
    .select("id")
    .eq("supplier_invoice_id", invoice.id)
    .eq("transaction_type", "expense")
    .maybeSingle();

  if (existing?.id) {
    await supabase.from("finance_transactions").update(payload).eq("id", existing.id);
  } else {
    await supabase.from("finance_transactions").insert(payload);
  }
}

async function markCustomerPaid(supabase: any, invoice: any, bankRow: any) {
  const now = new Date().toISOString();

  const { data: updated, error } = await supabase
    .from("finance_invoices")
    .update({
      status: "paid",
      paid_amount: n(invoice.total_amount),
      unpaid_amount: 0,
      paid_date: bankRow.transaction_date || today(),
      paid_at: now,
      payment_method: "bank_import",
      paid_bank_account_id: bankRow.bank_account_id || null,
      payment_reference: bankRow.reference || invoice.ocr_number || invoice.invoice_number,
      updated_at: now,
    })
    .eq("id", invoice.id)
    .select("*")
    .single();

  if (error) throw error;

  await upsertCustomerTransaction(supabase, updated, bankRow);

  await supabase
    .from("finance_bank_transactions")
    .update({
      status: "matched",
      matched_type: "customer_invoice",
      matched_invoice_id: invoice.id,
      matched_supplier_invoice_id: null,
      updated_at: now,
    })
    .eq("id", bankRow.id);

  return updated;
}

async function markSupplierPaid(supabase: any, invoice: any, bankRow: any) {
  const now = new Date().toISOString();

  const { data: updated, error } = await supabase
    .from("supplier_invoices")
    .update({
      status: "paid",
      paid_amount: n(invoice.total_amount),
      unpaid_amount: 0,
      paid_date: bankRow.transaction_date || today(),
      paid_at: now,
      payment_method: "bank_import",
      paid_bank_account_id: bankRow.bank_account_id || null,
      payment_reference: bankRow.reference || invoice.ocr_number || invoice.supplier_invoice_number,
      updated_at: now,
    })
    .eq("id", invoice.id)
    .select("*")
    .single();

  if (error) throw error;

  await upsertSupplierTransaction(supabase, updated, bankRow);

  await supabase
    .from("finance_bank_transactions")
    .update({
      status: "matched",
      matched_type: "supplier_invoice",
      matched_invoice_id: null,
      matched_supplier_invoice_id: invoice.id,
      updated_at: now,
    })
    .eq("id", bankRow.id);

  return updated;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
      });
    }

    const { data: bankRows, error: bankError } = await supabase
      .from("finance_bank_transactions")
      .select("*")
      .eq("status", "new")
      .order("transaction_date", { ascending: false })
      .limit(500);

    if (bankError) throw bankError;

    const { data: customerInvoicesRaw, error: customerError } = await supabase
      .from("finance_invoices")
      .select("*")
      .limit(1000);

    if (customerError) throw customerError;

    const { data: supplierInvoicesRaw, error: supplierError } = await supabase
      .from("supplier_invoices")
      .select("*")
      .limit(1000);

    if (supplierError) throw supplierError;

    const customerInvoices = (customerInvoicesRaw || [])
      .filter((row) => !isArchived(row.status))
      .filter((row) => !isPaid(row.status))
      .filter((row) => n(row.unpaid_amount || row.total_amount) > 0);

    const supplierInvoices = (supplierInvoicesRaw || [])
      .filter((row) => !isArchived(row.status))
      .filter((row) => !isPaid(row.status))
      .filter((row) => n(row.unpaid_amount || row.total_amount) > 0);

    const matches: any[] = [];
    const skipped: any[] = [];

    for (const bankRow of bankRows || []) {
      const amount = n(bankRow.amount);

      if (amount === 0) {
        skipped.push({
          bank_transaction_id: bankRow.id,
          reason: "Belopp saknas.",
        });
        continue;
      }

      if (amount > 0) {
        const candidates = customerInvoices
          .map((invoice) => ({
            invoice,
            score: customerScore(bankRow, invoice),
          }))
          .filter((item) => item.score >= 120)
          .sort((a, b) => b.score - a.score);

        if (candidates.length > 0) {
          const best = candidates[0];

          await markCustomerPaid(supabase, best.invoice, bankRow);

          matches.push({
            bank_transaction_id: bankRow.id,
            type: "customer_invoice",
            invoice_id: best.invoice.id,
            invoice_number: best.invoice.invoice_number,
            name: best.invoice.customer_name,
            amount: amount,
            score: best.score,
          });

          continue;
        }
      }

      if (amount < 0) {
        const candidates = supplierInvoices
          .map((invoice) => ({
            invoice,
            score: supplierScore(bankRow, invoice),
          }))
          .filter((item) => item.score >= 120)
          .sort((a, b) => b.score - a.score);

        if (candidates.length > 0) {
          const best = candidates[0];

          await markSupplierPaid(supabase, best.invoice, bankRow);

          matches.push({
            bank_transaction_id: bankRow.id,
            type: "supplier_invoice",
            invoice_id: best.invoice.id,
            invoice_number: best.invoice.supplier_invoice_number,
            name: best.invoice.supplier_name,
            amount: amount,
            score: best.score,
          });

          continue;
        }
      }

      skipped.push({
        bank_transaction_id: bankRow.id,
        reason: "Ingen säker matchning hittades.",
      });
    }

    return res.status(200).json({
      ok: true,
      checkedCount: bankRows?.length || 0,
      matchedCount: matches.length,
      skippedCount: skipped.length,
      matches,
      skipped,
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/bankhandelser/auto-match error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte matcha bankhändelser.",
    });
  }
}
