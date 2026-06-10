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

function isMissingTableError(error: any) {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();

  return (
    code === "42p01" ||
    code === "pgrst205" ||
    message.includes("does not exist") ||
    message.includes("could not find") ||
    message.includes("schema cache")
  );
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

function buildLine(line: any, index: number) {
  const totals = lineTotals(line);

  return {
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

function summary(invoices: any[]) {
  const active = invoices.filter((row) => row.status !== "archived");
  const unpaid = active.filter((row) => ["received", "approved", "unpaid", "overdue"].includes(row.status));
  const paid = active.filter((row) => row.status === "paid");

  return {
    total: active.length,
    unpaid: unpaid.length,
    paid: paid.length,
    unpaidAmount: Number(unpaid.reduce((sum, row) => sum + Number(row.unpaid_amount || 0), 0).toFixed(2)),
    paidAmount: Number(paid.reduce((sum, row) => sum + Number(row.total_amount || 0), 0).toFixed(2)),
    totalAmount: Number(active.reduce((sum, row) => sum + Number(row.total_amount || 0), 0).toFixed(2)),
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
      // Om finance_transactions saknar stöd ännu ska inte leverantörsfakturan stoppas.
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
    // Om tabellen inte är redo stoppar vi inte leverantörsfakturan.
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (req.method === "POST") {
      const body = req.body || {};
      const economySettings = await loadEconomySettings(supabase);
      applySupplierInvoiceDefaultsToBody(body, economySettings);
      const rawLines = Array.isArray(body.lines) ? body.lines : [];
      const lines = rawLines.map(buildLine).filter((line: any) => line.description);

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
        .insert(payload)
        .select("*")
        .single();

      if (invoiceError) {
        if (isMissingTableError(invoiceError)) {
          return res.status(200).json({
            ok: false,
            needsSetup: true,
            error: "Tabellerna för leverantörsreskontra saknas. Kör SQL-koden först.",
          });
        }

        throw invoiceError;
      }

      const linePayloads = lines.map((line: any) => ({
        ...line,
        supplier_invoice_id: invoice.id,
      }));

      const { error: lineError } = await supabase
        .from("supplier_invoice_lines")
        .insert(linePayloads);

      if (lineError) throw lineError;

      await createOrUpdateExpenseTransaction(supabase, invoice);

      return res.status(201).json({
        ok: true,
        invoice,
      });
    }

    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
      });
    }

    const tab = String(req.query.tab || "unpaid");
    const q = String(req.query.q || "").trim().toLowerCase();
    const statusFilter = String(req.query.status || "").trim();
    const originFilter = String(req.query.origin || "").trim();

    let query: any = supabase
      .from("supplier_invoices")
      .select("*")
      .neq("status", "archived")
      .order("due_date", { ascending: true })
      .order("invoice_date", { ascending: false })
      .limit(500);

    if (tab === "unpaid") query = query.in("status", ["received", "approved", "unpaid", "overdue"]);
    if (tab === "paid") query = query.eq("status", "paid");
    if (statusFilter) query = query.eq("status", statusFilter);
    if (originFilter) query = query.eq("invoice_origin", originFilter);

    const { data, error } = await query;

    if (error) {
      if (isMissingTableError(error)) {
        const meta = await loadMeta(supabase);

        return res.status(200).json({
          ok: true,
          needsSetup: true,
          supplierInvoices: [],
          summary: summary([]),
          ...meta,
        });
      }

      throw error;
    }

    let supplierInvoices = data || [];

    if (q) {
      supplierInvoices = supplierInvoices.filter((row: any) => {
        const haystack = [
          row.supplier_name,
          row.supplier_invoice_number,
          row.ocr_number,
          row.invoice_reference,
          row.linked_order_reference,
          row.category,
          row.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      });
    }

    const meta = await loadMeta(supabase);

    return res.status(200).json({
      ok: true,
      needsSetup: false,
      supplierInvoices,
      summary: summary(data || []),
      ...meta,
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/leverantorsreskontra error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera leverantörsfakturor.",
    });
  }
}
