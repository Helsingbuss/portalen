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

function today() {
  return new Date().toISOString().slice(0, 10);
}

function vatPercent(invoice: any) {
  const subtotal = Number(invoice.subtotal_excl_vat || 0);
  const vat = Number(invoice.vat_amount || 0);

  if (subtotal <= 0 || vat <= 0) return 0;

  return Number(((vat / subtotal) * 100).toFixed(2));
}

async function createOrUpdateExpenseTransaction(supabase: any, supplierInvoice: any) {
  const subtotal = Number(supplierInvoice.subtotal_excl_vat || 0);
  const vat = Number(supplierInvoice.vat_amount || 0);

  const payload = {
    transaction_type: "expense",
    transaction_date: supplierInvoice.paid_date || supplierInvoice.invoice_date || today(),
    title: "Betald leverantörsfaktura " + String(supplierInvoice.supplier_invoice_number || ""),
    description: supplierInvoice.notes || "Automatiskt skapad från betald leverantörsfaktura.",
    category: supplierInvoice.category || "Leverantörsfaktura",
    customer_supplier_name: supplierInvoice.supplier_name,
    gross_amount: Number(supplierInvoice.total_amount || 0),
    net_amount: subtotal,
    vat_amount: vat,
    vat_percent: vatPercent(supplierInvoice),
    amount_includes_vat: true,
    payment_method: supplierInvoice.payment_method || "bank_transfer",
    bank_account_id: supplierInvoice.paid_bank_account_id || null,
    reference:
      supplierInvoice.payment_reference ||
      supplierInvoice.ocr_number ||
      supplierInvoice.supplier_invoice_number,
    supplier_invoice_id: supplierInvoice.id,
    invoice_id: supplierInvoice.linked_customer_invoice_id || null,
    accounting_account: supplierInvoice.default_cost_account || "4010",
    vat_account: vat > 0 ? "2641" : null,
    status: "reconciled",
    notes: "Kopplad till leverantörsfaktura från " + String(supplierInvoice.supplier_name || ""),
    updated_at: new Date().toISOString(),
  };

  try {
    const { data: existing } = await supabase
      .from("finance_transactions")
      .select("id")
      .eq("supplier_invoice_id", supplierInvoice.id)
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from("finance_transactions")
        .update(payload)
        .eq("id", existing.id);
    } else {
      await supabase
        .from("finance_transactions")
        .insert(payload);
    }
  } catch (error) {
    console.warn("Kunde inte skapa kostnadstransaktion för leverantörsfaktura.", error);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({
      ok: false,
      error: "Leverantörsfaktura-ID saknas.",
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  try {
    const supabase = getSupabase();

    const { data: currentInvoice, error: currentError } = await supabase
      .from("supplier_invoices")
      .select("*")
      .eq("id", id)
      .single();

    if (currentError) throw currentError;

    if (currentInvoice.status === "archived") {
      return res.status(400).json({
        ok: false,
        error: "Arkiverad leverantörsfaktura kan inte markeras som betald.",
      });
    }

    const paidDate = cleanText(req.body?.paid_date) || today();
    const paymentMethod = cleanText(req.body?.payment_method) || "bank_transfer";
    const paidBankAccountId = cleanText(req.body?.paid_bank_account_id);
    const paymentReference =
      cleanText(req.body?.payment_reference) ||
      cleanText(currentInvoice.ocr_number) ||
      cleanText(currentInvoice.supplier_invoice_number);

    const now = new Date().toISOString();

    const { data: invoice, error: updateError } = await supabase
      .from("supplier_invoices")
      .update({
        status: "paid",
        paid_amount: Number(currentInvoice.total_amount || 0),
        unpaid_amount: 0,
        paid_date: paidDate,
        paid_at: now,
        payment_method: paymentMethod,
        paid_bank_account_id: paidBankAccountId || currentInvoice.paid_bank_account_id || null,
        payment_reference: paymentReference,
        updated_at: now,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) throw updateError;

    await createOrUpdateExpenseTransaction(supabase, invoice);

    return res.status(200).json({
      ok: true,
      invoice,
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/leverantorsreskontra/[id]/mark-paid error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte markera leverantörsfakturan som betald.",
    });
  }
}
