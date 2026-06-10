import { applyCustomerInvoiceDefaultsToBody, loadEconomySettings } from "@/lib/economySettings";
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import {
  findPrimaryInvoiceAccount,
  loadCompanyBankAccounts,
  loadCompanyFinanceSettings,
  paymentAccountText,
} from "@/lib/companyFinance";

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

function addDays(dateString: string, days: number) {
  const date = dateString ? new Date(dateString) : new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
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

function buildLine(line: any, index: number, invoiceId: string) {
  const totals = lineTotals(line);

  return {
    invoice_id: invoiceId,
    line_order: index + 1,
    article_id: cleanText(line.article_id),
    article_number: cleanText(line.article_number),
    description: cleanText(line.description) || "Fakturarad",
    extra_description: cleanText(line.extra_description),
    quantity: totals.quantity,
    unit: cleanText(line.unit) || "st",
    unit_price_excl_vat: totals.unit_price_excl_vat,
    discount_percent: totals.discount_percent,
    vat_percent: cleanNumber(line.vat_percent, 0),
    vat_account: cleanText(line.vat_account),
    sales_account: cleanText(line.sales_account),
    line_total_excl_vat: totals.line_total_excl_vat,
    vat_amount: totals.vat_amount,
    line_total_incl_vat: totals.line_total_incl_vat,
  };
}

function calculateInvoiceTotals(lines: any[]) {
  const subtotal = lines.reduce((sum, line) => sum + Number(line.line_total_excl_vat || 0), 0);
  const vat = lines.reduce((sum, line) => sum + Number(line.vat_amount || 0), 0);
  const totalBeforeRound = subtotal + vat;

  // Öresavrundning till närmaste hela krona.
  // Ex: 4711,70 kr → 4712,00 kr och avrundning +0,30 kr.
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
  const [accounts, settings] = await Promise.all([
    loadCompanyBankAccounts(supabase),
    loadCompanyFinanceSettings(supabase),
  ]);

  const invoiceAccount = findPrimaryInvoiceAccount(accounts);

  const { data: articles } = await supabase
    .from("finance_articles")
    .select("*")
    .eq("is_active", true)
    .order("article_number", { ascending: true })
    .order("article_name", { ascending: true });

  const { data: vatRates } = await supabase
    .from("company_vat_rates")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  return {
    articles: articles || [],
    vatRates: vatRates || [],
    accounts,
    invoiceAccount,
    settings,
    paymentText:
      settings?.invoice_payment_text ||
      paymentAccountText(invoiceAccount) ||
      "Betalningsuppgifter saknas.",
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({
      ok: false,
      error: "Faktura-ID saknas.",
    });
  }

  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const { data: invoice, error: invoiceError } = await supabase
        .from("finance_invoices")
        .select("*")
        .eq("id", id)
        .single();

      if (invoiceError) throw invoiceError;

      const { data: lines, error: linesError } = await supabase
        .from("finance_invoice_lines")
        .select("*")
        .eq("invoice_id", id)
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
      applyCustomerInvoiceDefaultsToBody(body, economySettings);
      const rawLines = Array.isArray(body.lines) ? body.lines : [];
      const lines = rawLines.map((line: any, index: number) => buildLine(line, index, id)).filter((line: any) => line.description);

      if (!body.customer_name) {
        return res.status(400).json({
          ok: false,
          error: "Kundnamn saknas.",
        });
      }

      if (lines.length === 0) {
        return res.status(400).json({
          ok: false,
          error: "Minst en fakturarad krävs.",
        });
      }

      const meta = await loadMeta(supabase);
      const settings = meta.settings || {};
      const invoiceDate = cleanText(body.invoice_date) || new Date().toISOString().slice(0, 10);
      const terms = Number(body.payment_terms_days || settings.default_payment_terms_days || 10);
      const dueDate = cleanText(body.due_date) || addDays(invoiceDate, terms);
      const totals = calculateInvoiceTotals(lines);
      const paidAmount = cleanNumber(body.paid_amount, 0);

      const invoicePayload = {
        voucher_number: cleanText(body.voucher_number),
        ocr_number: cleanText(body.ocr_number),
        customer_id: cleanText(body.customer_id),
        customer_number: cleanText(body.customer_number),
        customer_name: cleanText(body.customer_name),
        customer_email: cleanText(body.customer_email),
        customer_address: cleanText(body.customer_address),
        customer_zip: cleanText(body.customer_zip),
        customer_city: cleanText(body.customer_city),
        customer_country: cleanText(body.customer_country) || "Sverige",

        invoice_date: invoiceDate,
        due_date: dueDate,
        payment_terms_days: terms,

        your_reference: cleanText(body.your_reference),
        our_reference: cleanText(body.our_reference),
        order_reference: cleanText(body.order_reference),

        invoice_type: cleanText(body.invoice_type) || "debit",
        category: cleanText(body.category) || "Normal",
        status: cleanText(body.status) || "draft",
        currency: cleanText(body.currency) || "SEK",

        subtotal_excl_vat: totals.subtotal_excl_vat,
        vat_amount: totals.vat_amount,
        rounding_amount: totals.rounding_amount,
        total_amount: totals.total_amount,
        paid_amount: paidAmount,
        unpaid_amount: Number((totals.total_amount - paidAmount).toFixed(2)),

        payment_text: cleanText(body.payment_text) || meta.paymentText,
        notes: cleanText(body.notes),
        internal_notes: cleanText(body.internal_notes),
        updated_at: new Date().toISOString(),
      };

      const { data: invoice, error: invoiceError } = await supabase
        .from("finance_invoices")
        .update(invoicePayload)
        .eq("id", id)
        .select("*")
        .single();

      if (invoiceError) throw invoiceError;

      const { error: deleteError } = await supabase
        .from("finance_invoice_lines")
        .delete()
        .eq("invoice_id", id);

      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from("finance_invoice_lines")
        .insert(lines);

      if (insertError) throw insertError;

      return res.status(200).json({
        ok: true,
        invoice,
      });
    }

    if (req.method === "DELETE") {
      const { data, error } = await supabase
        .from("finance_invoices")
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
        invoice: data,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/fakturor/[id] error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera fakturan.",
    });
  }
}
