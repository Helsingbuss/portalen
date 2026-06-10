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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({
      ok: false,
      error: "Faktura-ID saknas.",
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

    const { data: invoice, error: invoiceError } = await supabase
      .from("finance_invoices")
      .select("*")
      .eq("id", id)
      .single();

    if (invoiceError) throw invoiceError;

    if (invoice.status === "archived") {
      return res.status(400).json({
        ok: false,
        error: "Arkiverad faktura kan inte markeras som betald.",
      });
    }

    const paidDate = cleanText(req.body?.paid_date) || today();
    const paymentMethod = cleanText(req.body?.payment_method) || "bank_transfer";
    const bankAccountId = cleanText(req.body?.bank_account_id);
    const paymentReference =
      cleanText(req.body?.payment_reference) ||
      cleanText(invoice.ocr_number) ||
      cleanText(invoice.invoice_number);

    const totalAmount = Number(invoice.total_amount || 0);
    const now = new Date().toISOString();

    const { data: updatedInvoice, error: updateError } = await supabase
      .from("finance_invoices")
      .update({
        status: "paid",
        paid_amount: totalAmount,
        unpaid_amount: 0,
        paid_date: paidDate,
        paid_at: now,
        payment_method: paymentMethod,
        paid_bank_account_id: bankAccountId,
        payment_reference: paymentReference,
        updated_at: now,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) throw updateError;

    const transactionPayload = {
      transaction_type: "income",
      transaction_date: paidDate,
      title: "Betald faktura " + String(invoice.invoice_number || ""),
      description: "Automatiskt skapad från betald kundfaktura.",
      category: invoice.category || "Faktura",
      customer_supplier_name: invoice.customer_name,
      gross_amount: totalAmount,
      net_amount: Number(invoice.subtotal_excl_vat || 0),
      vat_amount: Number(invoice.vat_amount || 0),
      vat_percent: vatPercent(invoice),
      amount_includes_vat: true,
      payment_method: paymentMethod,
      bank_account_id: bankAccountId,
      reference: paymentReference,
      invoice_id: id,
      accounting_account: "3010",
      vat_account: invoice.vat_amount > 0 ? "2631" : null,
      status: "reconciled",
      notes: "Kopplad till faktura " + String(invoice.invoice_number || ""),
      updated_at: now,
    };

    const { data: existingTransaction } = await supabase
      .from("finance_transactions")
      .select("id")
      .eq("invoice_id", id)
      .eq("transaction_type", "income")
      .maybeSingle();

    if (existingTransaction?.id) {
      await supabase
        .from("finance_transactions")
        .update(transactionPayload)
        .eq("id", existingTransaction.id);
    } else {
      await supabase
        .from("finance_transactions")
        .insert(transactionPayload);
    }

    return res.status(200).json({
      ok: true,
      invoice: updatedInvoice,
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/fakturor/[id]/mark-paid error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte markera fakturan som betald.",
    });
  }
}
