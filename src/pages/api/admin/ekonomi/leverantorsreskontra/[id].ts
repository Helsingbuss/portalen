import { applySupplierInvoiceDefaultsToBody, loadEconomySettings } from "@/lib/economySettings";
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { loadCompanyBankAccounts } from "@/lib/companyFinance";

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

function lineTotals(line: any) {
  const quantity = cleanNumber(line.quantity, 1);
  const unitPrice = cleanNumber(line.unit_price_excl_vat, 0);
  const discountPercent = cleanNumber(line.discount_percent, 0);
  const vatPercent = cleanNumber(line.vat_percent, 0);

  const beforeDiscount = quantity * unitPrice;
  const discountAmount = beforeDiscount * discountPercent / 100;
  const excl = beforeDiscount - discountAmount;
  const vat = excl * vatPercent / 100;
  const incl = excl + vat;

  return {
    quantity,
    unit_price_excl_vat: Number(unitPrice.toFixed(2)),
    discount_percent: Number(discountPercent.toFixed(2)),
    line_total_excl_vat: Number(excl.toFixed(2)),
    vat_amount: Number(vat.toFixed(2)),
    line_total_incl_vat: Number(incl.toFixed(2)),
  };
}

function buildLine(line: any, index: number, supplierInvoiceId: string) {
  const totals = lineTotals(line);

  return {
    supplier_invoice_id: supplierInvoiceId,
    line_order: index + 1,
    description: cleanText(line.description) || "Leverantörsrad",
    extra_description: cleanText(line.extra_description),
    quantity: totals.quantity,
    unit: cleanText(line.unit) || "st",
    unit_price_excl_vat: totals.unit_price_excl_vat,
    discount_percent: totals.discount_percent,
    vat_percent: cleanNumber(line.vat_percent, 0),
    cost_account: cleanText(line.cost_account) || "4010",
    vat_account: cleanText(line.vat_account) || "2641",
    line_total_excl_vat: totals.line_total_excl_vat,
    vat_amount: totals.vat_amount,
    line_total_incl_vat: totals.line_total_incl_vat,
  };
}

function calculateInvoiceTotals(lines: any[]) {
  const subtotal = lines.reduce((sum, line) => sum + Number(line.line_total_excl_vat || 0), 0);
  const vat = lines.reduce((sum, line) => sum + Number(line.vat_amount || 0), 0);
  const totalBeforeRound = subtotal + vat;

  const rounded = Math.round(totalBeforeRound);
  const rounding = rounded - totalBeforeRound;

  return {
    subtotal_excl_vat: Number(subtotal.toFixed(2)),
    vat_amount: Number(vat.toFixed(2)),
    rounding_amount: Number(rounding.toFixed(2)),
    total_amount: Number(rounded.toFixed(2)),
  };
}

async function loadMeta(supabase: any) {
  const accounts = await loadCompanyBankAccounts(supabase);

  const { data: customerInvoices } = await supabase
    .from("finance_invoices")
    .select("id, invoice_number, customer_name, order_reference, total_amount, status")
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .limit(200);

  return {
    accounts: accounts || [],
    customerInvoices: customerInvoices || [],
  };
}

async function createOrUpdateExpenseTransaction(supabase: any, supplierInvoice: any) {
  if (supplierInvoice.status !== "paid") {
    try {
      await supabase
        .from("finance_transactions")
        .delete()
        .eq("supplier_invoice_id", supplierInvoice.id);
    } catch {
      // Ignorera om finance_transactions inte är redo.
    }

    return;
  }

  const subtotal = Number(supplierInvoice.subtotal_excl_vat || 0);
  const vat = Number(supplierInvoice.vat_amount || 0);
  const vatPercent = subtotal > 0 && vat > 0 ? Number(((vat / subtotal) * 100).toFixed(2)) : 0;

  const payload = {
    transaction_type: "expense",
    transaction_date: supplierInvoice.paid_date || supplierInvoice.invoice_date,
    title: "Betald leverantörsfaktura " + String(supplierInvoice.supplier_invoice_number || supplierInvoice.id),
    description: supplierInvoice.notes || "Automatiskt skapad från leverantörsfaktura.",
    category: supplierInvoice.category || "Leverantörsfaktura",
    customer_supplier_name: supplierInvoice.supplier_name,
    gross_amount: Number(supplierInvoice.total_amount || 0),
    net_amount: subtotal,
    vat_amount: vat,
    vat_percent: vatPercent,
    amount_includes_vat: true,
    payment_method: supplierInvoice.payment_method || "bank_transfer",
    bank_account_id: supplierInvoice.paid_bank_account_id || null,
    reference: supplierInvoice.payment_reference || supplierInvoice.ocr_number || supplierInvoice.supplier_invoice_number,
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
  } catch {
    // Ignorera transaktionsfel för nu.
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

  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const { data: invoice, error: invoiceError } = await supabase
        .from("supplier_invoices")
        .select("*")
        .eq("id", id)
        .single();

      if (invoiceError) throw invoiceError;

      const { data: lines, error: linesError } = await supabase
        .from("supplier_invoice_lines")
        .select("*")
        .eq("supplier_invoice_id", id)
        .order("line_order", { ascending: true });

      if (linesError) throw linesError;

      const meta = await loadMeta(supabase);

      return res.status(200).json({
        ok: true,
        invoice,
        lines: lines || [],
        ...meta,
      });
    }

    if (req.method === "PUT") {
      const body = req.body || {};
      const economySettings = await loadEconomySettings(supabase);
      applySupplierInvoiceDefaultsToBody(body, economySettings);
      const rawLines = Array.isArray(body.lines) ? body.lines : [];
      const lines = rawLines.map((line: any, index: number) => buildLine(line, index, id)).filter((line: any) => line.description);

      if (!body.supplier_name) {
        return res.status(400).json({
          ok: false,
          error: "Leverantör/samarbetspartner saknas.",
        });
      }

      if (!body.supplier_invoice_number) {
        return res.status(400).json({
          ok: false,
          error: "Leverantörens fakturanummer saknas.",
        });
      }

      if (lines.length === 0) {
        return res.status(400).json({
          ok: false,
          error: "Minst en rad krävs.",
        });
      }

      const totals = calculateInvoiceTotals(lines);
      const status = cleanText(body.status) || "received";
      const paidAmount = status === "paid" ? totals.total_amount : cleanNumber(body.paid_amount, 0);
      const now = new Date().toISOString();

      const payload = {
        invoice_origin: cleanText(body.invoice_origin) || "current",
        supplier_type: cleanText(body.supplier_type) || "supplier",
        supplier_name: cleanText(body.supplier_name),
        supplier_org_number: cleanText(body.supplier_org_number),
        supplier_email: cleanText(body.supplier_email),

        supplier_invoice_number: cleanText(body.supplier_invoice_number),
        ocr_number: cleanText(body.ocr_number),
        invoice_reference: cleanText(body.invoice_reference),

        invoice_date: cleanText(body.invoice_date),
        due_date: cleanText(body.due_date),
        received_date: cleanText(body.received_date),

        linked_customer_invoice_id: cleanText(body.linked_customer_invoice_id),
        linked_order_reference: cleanText(body.linked_order_reference),
        linked_booking_id: cleanText(body.linked_booking_id),
        linked_offer_id: cleanText(body.linked_offer_id),

        category: cleanText(body.category) || "Leverantörsfaktura",
        status,
        currency: cleanText(body.currency) || "SEK",

        subtotal_excl_vat: totals.subtotal_excl_vat,
        vat_amount: totals.vat_amount,
        rounding_amount: totals.rounding_amount,
        total_amount: totals.total_amount,
        paid_amount: paidAmount,
        unpaid_amount: Number((totals.total_amount - paidAmount).toFixed(2)),

        paid_date: status === "paid" ? cleanText(body.paid_date) : null,
        paid_at: status === "paid" ? now : null,
        payment_method: status === "paid" ? cleanText(body.payment_method) || "bank_transfer" : cleanText(body.payment_method),
        paid_bank_account_id: cleanText(body.paid_bank_account_id),
        payment_reference: cleanText(body.payment_reference),

        notes: cleanText(body.notes),
        internal_notes: cleanText(body.internal_notes),
        default_cost_account: cleanText(body.default_cost_account) || "4010",
        updated_at: now,
      };

      const { data: invoice, error: invoiceError } = await supabase
        .from("supplier_invoices")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();

      if (invoiceError) throw invoiceError;

      const { error: deleteError } = await supabase
        .from("supplier_invoice_lines")
        .delete()
        .eq("supplier_invoice_id", id);

      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from("supplier_invoice_lines")
        .insert(lines);

      if (insertError) throw insertError;

      await createOrUpdateExpenseTransaction(supabase, invoice);

      return res.status(200).json({
        ok: true,
        invoice,
      });
    }

    if (req.method === "DELETE") {
      const { data, error } = await supabase
        .from("supplier_invoices")
        .update({
          status: "archived",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      try {
        await supabase
          .from("finance_transactions")
          .delete()
          .eq("supplier_invoice_id", id);
      } catch {
        // Ignorera.
      }

      return res.status(200).json({
        ok: true,
        invoice: data,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/leverantorsreskontra/[id] error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera leverantörsfakturan.",
    });
  }
}
