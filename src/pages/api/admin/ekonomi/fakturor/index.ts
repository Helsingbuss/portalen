import { applyCustomerInvoiceDefaultsToBody, loadEconomySettings } from "@/lib/economySettings";
import { reserveInvoiceNumbers } from "@/lib/invoiceNumbering";
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

function buildLine(line: any, index: number) {
  const totals = lineTotals(line);

  return {
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

async function ensureInvoiceNumberIsFree(supabase: any, invoiceNumber?: string | null, ocrNumber?: string | null) {
  const invoiceNumberText = String(invoiceNumber || "").trim();
  const ocrNumberText = String(ocrNumber || "").trim();

  if (invoiceNumberText) {
    const { data: existingInvoice } = await supabase
      .from("finance_invoices")
      .select("id, invoice_number, customer_name, status")
      .eq("invoice_number", invoiceNumberText)
      .maybeSingle();

    if (existingInvoice?.id) {
      throw new Error(
        "Fakturanummer " +
          invoiceNumberText +
          " finns redan på faktura för " +
          (existingInvoice.customer_name || "okänd kund") +
          ". Välj ett annat nummer eller öppna den befintliga fakturan."
      );
    }
  }

  if (ocrNumberText) {
    const { data: existingOcr } = await supabase
      .from("finance_invoices")
      .select("id, ocr_number, customer_name, status")
      .eq("ocr_number", ocrNumberText)
      .maybeSingle();

    if (existingOcr?.id) {
      throw new Error(
        "OCR " +
          ocrNumberText +
          " finns redan på faktura för " +
          (existingOcr.customer_name || "okänd kund") +
          ". Välj ett annat OCR eller öppna den befintliga fakturan."
      );
    }
  }
}

async function nextInvoiceNumber(supabase: any) {
  const { data } = await supabase
    .from("finance_invoices")
    .select("invoice_number")
    .not("invoice_number", "is", null)
    .limit(500);

  const numbers = (data || [])
    .map((row: any) => Number(String(row.invoice_number || "").replace(/[^0-9]/g, "")))
    .filter((n: number) => Number.isFinite(n));

  const next = numbers.length ? Math.max(...numbers) + 1 : 1;

  return String(next);
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

function summary(invoices: any[]) {
  const active = invoices.filter((row) => row.status !== "archived");
  const drafts = active.filter((row) => row.status === "draft");
  const unpaid = active.filter((row) => ["sent", "unpaid", "overdue"].includes(row.status));
  const paid = active.filter((row) => row.status === "paid");

  return {
    total: active.length,
    drafts: drafts.length,
    unpaid: unpaid.length,
    paid: paid.length,
    unpaidAmount: Number(unpaid.reduce((sum, row) => sum + Number(row.unpaid_amount || 0), 0).toFixed(2)),
    totalAmount: Number(active.reduce((sum, row) => sum + Number(row.total_amount || 0), 0).toFixed(2)),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (req.method === "POST") {
      const body = req.body || {};
      const economySettings = await loadEconomySettings(supabase);
      applyCustomerInvoiceDefaultsToBody(body, economySettings);
      const rawLines = Array.isArray(body.lines) ? body.lines : [];
      const lines = rawLines.map(buildLine).filter((line: any) => line.description);

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
      const manualInvoiceNumber = cleanText(body.invoice_number);
      const manualOcrNumber = cleanText(body.ocr_number);

      let invoiceNumber = manualInvoiceNumber;
      let ocrNumber = manualOcrNumber;

      if (!invoiceNumber || !ocrNumber) {
        const reservedNumbers = await reserveInvoiceNumbers(supabase);
        invoiceNumber = invoiceNumber || reservedNumbers.invoiceNumber;
        ocrNumber = ocrNumber || reservedNumbers.ocrNumber;
      }

      await ensureInvoiceNumberIsFree(supabase, invoiceNumber, ocrNumber);

      const invoicePayload = {
        invoice_number: invoiceNumber,
        ocr_number: ocrNumber,
        voucher_number: cleanText(body.voucher_number),
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
        paid_amount: cleanNumber(body.paid_amount, 0),
        unpaid_amount: Number((totals.total_amount - cleanNumber(body.paid_amount, 0)).toFixed(2)),

        payment_text: cleanText(body.payment_text) || meta.paymentText,
        notes: cleanText(body.notes),
        internal_notes: cleanText(body.internal_notes),
        updated_at: new Date().toISOString(),
      };

      const { data: invoice, error: invoiceError } = await supabase
        .from("finance_invoices")
        .insert(invoicePayload)
        .select("*")
        .single();

      if (invoiceError) {
        if (isMissingTableError(invoiceError)) {
          return res.status(200).json({
            ok: false,
            needsSetup: true,
            error: "Fakturatabellerna saknas. Kör SQL-koden först.",
          });
        }

        throw invoiceError;
      }

      const linePayloads = lines.map((line: any) => ({
        ...line,
        invoice_id: invoice.id,
      }));

      const { error: linesError } = await supabase
        .from("finance_invoice_lines")
        .insert(linePayloads);

      if (linesError) throw linesError;

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

    let query: any = supabase
      .from("finance_invoices")
      .select("*")
      .neq("status", "archived")
      .order("due_date", { ascending: true })
      .order("invoice_date", { ascending: false })
      .limit(500);

    if (tab === "draft") query = query.eq("status", "draft");
    if (tab === "unpaid") query = query.in("status", ["sent", "unpaid", "overdue"]);
    if (statusFilter) query = query.eq("status", statusFilter);

    const { data, error } = await query;

    if (error) {
      if (isMissingTableError(error)) {
        const meta = await loadMeta(supabase);

        return res.status(200).json({
          ok: true,
          needsSetup: true,
          invoices: [],
          summary: summary([]),
          ...meta,
        });
      }

      throw error;
    }

    let invoices = data || [];

    if (q) {
      invoices = invoices.filter((row: any) => {
        const haystack = [
          row.invoice_number,
          row.voucher_number,
          row.customer_number,
          row.customer_name,
          row.order_reference,
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
      invoices,
      summary: summary(data || []),
      ...meta,
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/fakturor error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera fakturor.",
    });
  }
}
