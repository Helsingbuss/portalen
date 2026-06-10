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

function pick(row: any, keys: string[]) {
  for (const key of keys) {
    const value = row?.[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return "";
}

function pickNumber(row: any, keys: string[]) {
  for (const key of keys) {
    const value = row?.[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      const parsed = Number(String(value).replace(",", "."));

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return 0;
}

function addDays(dateString: string, days: number) {
  const date = dateString ? new Date(dateString) : new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
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

  return {
    settings,
    invoiceAccount,
    paymentText:
      settings?.invoice_payment_text ||
      paymentAccountText(invoiceAccount) ||
      "Betalningsuppgifter saknas.",
  };
}

async function findBusArticle(supabase: any) {
  const { data } = await supabase
    .from("finance_articles")
    .select("*")
    .eq("is_active", true)
    .limit(200);

  const articles = data || [];

  return (
    articles.find((article: any) =>
      String(article.article_name || "").toLowerCase().includes("hyra av buss")
    ) ||
    articles.find((article: any) =>
      String(article.article_group || "").toLowerCase().includes("buss")
    ) ||
    articles[0] ||
    null
  );
}

function buildDescription(offer: any) {
  const date = pick(offer, ["travel_date", "trip_date", "date", "pickup_date", "departure_date", "start_date"]);
  const time = pick(offer, ["travel_time", "trip_time", "time", "pickup_time", "departure_time", "start_time"]);
  const from = pick(offer, ["from_address", "pickup_address", "pickup", "from", "start_address", "departure_address", "pickup_location"]);
  const to = pick(offer, ["to_address", "destination_address", "destination", "to", "end_address", "arrival_address", "dropoff_location"]);
  const passengers = pick(offer, ["passengers", "passenger_count", "number_of_passengers", "people", "persons"]);

  const parts = [
    "Bussresa enligt offert.",
    date || time ? "Datum/tid: " + [date, time].filter(Boolean).join(" ") : "",
    from ? "Från: " + from : "",
    to ? "Till: " + to : "",
    passengers ? "Antal passagerare: " + passengers : "",
  ];

  return parts.filter(Boolean).join("\n");
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

function customerName(offer: any) {
  return (
    pick(offer, ["customer_name", "company_name", "contact_name", "name", "full_name", "client_name"]) ||
    "Kund"
  );
}

function customerEmail(offer: any) {
  return pick(offer, ["customer_email", "email", "contact_email"]);
}

function customerPhone(offer: any) {
  return pick(offer, ["customer_phone", "phone", "contact_phone", "mobile"]);
}

function customerAddress(offer: any) {
  return pick(offer, ["invoice_address", "billing_address", "customer_address", "address"]);
}

function offerReference(offer: any) {
  return (
    pick(offer, ["offer_number", "quote_number", "reference", "booking_reference", "order_reference"]) ||
    String(offer.id || "")
  );
}

function offerPriceInclVat(offer: any) {
  return pickNumber(offer, [
    "price",
    "total_price",
    "quoted_price",
    "offer_price",
    "total_amount",
    "amount",
    "price_incl_vat",
    "final_price",
  ]);
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

    const offerId = String(req.body?.offer_id || req.body?.offerId || "").trim();

    if (!offerId) {
      return res.status(400).json({
        ok: false,
        error: "Offert-ID saknas.",
      });
    }

    const { data: offer, error: offerError } = await supabase
      .from("offers")
      .select("*")
      .eq("id", offerId)
      .single();

    if (offerError) throw offerError;

    const meta = await loadMeta(supabase);
    const settings = meta.settings || {};
    const article = await findBusArticle(supabase);

    const invoiceDate = new Date().toISOString().slice(0, 10);
    const terms = Number(settings.default_payment_terms_days || 10);
    const dueDate = addDays(invoiceDate, terms);

    const vatPercent = Number(article?.vat_percent ?? 6);
    const priceInclVat = offerPriceInclVat(offer);
    const unitPriceExclVat =
      priceInclVat > 0
        ? Number((priceInclVat / (1 + vatPercent / 100)).toFixed(2))
        : Number(article?.price_excl_vat || 0);

    const rawLine = {
      line_order: 1,
      article_id: article?.id || null,
      article_number: article?.article_number || null,
      description: article?.article_name || "Hyra av buss inkl. förare",
      extra_description: buildDescription(offer),
      quantity: 1,
      unit: article?.unit || "st",
      unit_price_excl_vat: unitPriceExclVat,
      discount_percent: 0,
      vat_percent: vatPercent,
      vat_account: article?.vat_account || "2631",
      sales_account: article?.sales_account || article?.vat_account || "2631",
    };

    const totals = lineTotals(rawLine);

    const invoiceLine = {
      ...rawLine,
      ...totals,
    };

    const invoiceTotals = calculateInvoiceTotals([invoiceLine]);
    const reservedNumbers = await reserveInvoiceNumbers(supabase);
    const invoiceNumber = reservedNumbers.invoiceNumber;
    const ocrNumber = reservedNumbers.ocrNumber;

    const invoicePayload = {
      invoice_number: invoiceNumber,
      ocr_number: ocrNumber,
      offer_id: String(offer.id || offerId),
      offer_snapshot: offer,

      customer_number: pick(offer, ["customer_number", "client_number"]),
      customer_name: customerName(offer),
      customer_email: customerEmail(offer),
      customer_address: customerAddress(offer),
      customer_zip: pick(offer, ["customer_zip", "zip", "postal_code", "billing_zip"]),
      customer_city: pick(offer, ["customer_city", "city", "billing_city"]),
      customer_country: pick(offer, ["customer_country", "country"]) || "Sverige",

      invoice_date: invoiceDate,
      due_date: dueDate,
      payment_terms_days: terms,

      your_reference: pick(offer, ["your_reference", "customer_reference", "contact_name"]) || customerName(offer),
      our_reference: "Andreas Ekelöf",
      order_reference: offerReference(offer),

      invoice_type: "debit",
      category: "Bussresa",
      status: "draft",
      currency: "SEK",

      subtotal_excl_vat: invoiceTotals.subtotal_excl_vat,
      vat_amount: invoiceTotals.vat_amount,
      rounding_amount: invoiceTotals.rounding_amount,
      total_amount: invoiceTotals.total_amount,
      paid_amount: 0,
      unpaid_amount: invoiceTotals.total_amount,

      payment_text: meta.paymentText,
      notes: "Vi ser gärna betalningen sker omgående.",
      internal_notes:
        "Skapad från offert " + offerReference(offer) + ". Telefon: " + customerPhone(offer),
      updated_at: new Date().toISOString(),
    };

    const { data: invoice, error: invoiceError } = await supabase
      .from("finance_invoices")
      .insert(invoicePayload)
      .select("*")
      .single();

    if (invoiceError) throw invoiceError;

    const { error: lineError } = await supabase
      .from("finance_invoice_lines")
      .insert({
        ...invoiceLine,
        invoice_id: invoice.id,
      });

    if (lineError) throw lineError;

    return res.status(201).json({
      ok: true,
      invoice,
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/fakturor/from-offer error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte skapa faktura från offert.",
    });
  }
}
