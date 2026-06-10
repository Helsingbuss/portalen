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

function cleanText(value: any) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function isPaid(status: any) {
  return String(status || "").toLowerCase() === "paid";
}

function isArchived(status: any) {
  return String(status || "").toLowerCase() === "archived";
}

function amountDue(row: any) {
  return n(row.unpaid_amount || row.total_amount);
}

function vatPercent(row: any) {
  const subtotal = n(row.subtotal_excl_vat);
  const vat = n(row.vat_amount);

  if (subtotal <= 0 || vat <= 0) return 0;

  return Number(((vat / subtotal) * 100).toFixed(2));
}

function scoreAmount(bankAmount: number, invoiceAmount: number) {
  const diff = Math.abs(Math.abs(bankAmount) - Math.abs(invoiceAmount));

  if (diff < 0.01) return 100;
  if (diff <= 1) return 70;
  if (diff <= 10) return 40;

  return 0;
}

function cleanDigits(value: any) {
  return String(value || "").replace(/[^0-9]/g, "");
}

function textScore(bankRow: any, invoice: any, type: "customer" | "supplier") {
  const text = [
    bankRow.description,
    bankRow.reference,
    bankRow.raw_data ? JSON.stringify(bankRow.raw_data) : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const digits = cleanDigits(text);
  let score = 0;

  const ocr = cleanDigits(invoice.ocr_number);
  if (ocr && digits.includes(ocr)) score += 80;

  const invoiceNumber = cleanDigits(type === "customer" ? invoice.invoice_number : invoice.supplier_invoice_number);
  if (invoiceNumber && digits.includes(invoiceNumber)) score += 45;

  const name = String(type === "customer" ? invoice.customer_name : invoice.supplier_name || "").toLowerCase();
  if (name && text.includes(name)) score += 20;

  return score;
}

async function upsertCustomerTransaction(supabase: any, invoice: any, bankRow: any) {
  const payload = {
    transaction_type: "income",
    transaction_date: bankRow.transaction_date || invoice.paid_date || today(),
    title: "Betald kundfaktura " + String(invoice.invoice_number || ""),
    description: "Manuellt matchad mot bankhändelse.",
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
    notes: "Manuellt matchad från importerad bankhändelse.",
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
    description: "Manuellt matchad mot bankhändelse.",
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
    notes: "Manuellt matchad från importerad bankhändelse.",
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
  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({
      ok: false,
      error: "Bankhändelse-ID saknas.",
    });
  }

  try {
    const supabase = getSupabase();

    const { data: bankRow, error: bankError } = await supabase
      .from("finance_bank_transactions")
      .select("*")
      .eq("id", id)
      .single();

    if (bankError) throw bankError;

    if (req.method === "GET") {
      const amount = n(bankRow.amount);

      const { data: customerRaw, error: customerError } = await supabase
        .from("finance_invoices")
        .select("*")
        .neq("status", "archived")
        .order("due_date", { ascending: true })
        .limit(500);

      if (customerError) throw customerError;

      const { data: supplierRaw, error: supplierError } = await supabase
        .from("supplier_invoices")
        .select("*")
        .neq("status", "archived")
        .order("due_date", { ascending: true })
        .limit(500);

      if (supplierError) throw supplierError;

      const customerCandidates = (customerRaw || [])
        .filter((row) => !isPaid(row.status))
        .filter((row) => amountDue(row) > 0)
        .map((row) => ({
          id: row.id,
          type: "customer",
          invoice_number: row.invoice_number,
          ocr_number: row.ocr_number,
          name: row.customer_name,
          due_date: row.due_date,
          amount_due: amountDue(row),
          total_amount: n(row.total_amount),
          score: scoreAmount(amount, amountDue(row)) + textScore(bankRow, row, "customer"),
          href: "/admin/ekonomi/fakturor/" + row.id,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 50);

      const supplierCandidates = (supplierRaw || [])
        .filter((row) => !isPaid(row.status))
        .filter((row) => amountDue(row) > 0)
        .map((row) => ({
          id: row.id,
          type: "supplier",
          invoice_number: row.supplier_invoice_number,
          ocr_number: row.ocr_number,
          name: row.supplier_name,
          due_date: row.due_date,
          amount_due: amountDue(row),
          total_amount: n(row.total_amount),
          score: scoreAmount(amount, amountDue(row)) + textScore(bankRow, row, "supplier"),
          href: "/admin/ekonomi/leverantorsreskontra/" + row.id,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 50);

      return res.status(200).json({
        ok: true,
        bankTransaction: bankRow,
        customerCandidates,
        supplierCandidates,
      });
    }

    if (req.method === "POST") {
      if (bankRow.status === "matched") {
        return res.status(400).json({
          ok: false,
          error: "Bankhändelsen är redan matchad.",
        });
      }

      const type = cleanText(req.body?.type);
      const invoiceId = cleanText(req.body?.invoice_id);

      if (!type || !invoiceId) {
        return res.status(400).json({
          ok: false,
          error: "Typ och faktura-ID krävs.",
        });
      }

      if (type === "customer") {
        const { data: invoice, error: invoiceError } = await supabase
          .from("finance_invoices")
          .select("*")
          .eq("id", invoiceId)
          .single();

        if (invoiceError) throw invoiceError;

        const updated = await markCustomerPaid(supabase, invoice, bankRow);

        return res.status(200).json({
          ok: true,
          matched_type: "customer_invoice",
          invoice: updated,
        });
      }

      if (type === "supplier") {
        const { data: invoice, error: invoiceError } = await supabase
          .from("supplier_invoices")
          .select("*")
          .eq("id", invoiceId)
          .single();

        if (invoiceError) throw invoiceError;

        const updated = await markSupplierPaid(supabase, invoice, bankRow);

        return res.status(200).json({
          ok: true,
          matched_type: "supplier_invoice",
          invoice: updated,
        });
      }

      return res.status(400).json({
        ok: false,
        error: "Okänd matchningstyp.",
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/bankhandelser/[id]/match error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera manuell matchning.",
    });
  }
}
