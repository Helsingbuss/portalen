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

function isoDate(value?: any) {
  if (!value) return "";

  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return String(value || "").slice(0, 10);
  }
}

function clean(value: any) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/;/g, ",")
    .replace(/\s+/g, " ")
    .trim();
}

function csvEscape(value: any) {
  const text = clean(value);

  if (text.includes('"') || text.includes(";") || text.includes("\n")) {
    return '"' + text.replace(/"/g, '""') + '"';
  }

  return text;
}

function csvMoney(value: any) {
  return String(n(value).toFixed(2)).replace(".", ",");
}

function thisYearRange() {
  const now = new Date();
  const year = now.getFullYear();

  return {
    start: year + "-01-01",
    end: year + "-12-31",
  };
}

function thisMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();

  return {
    start: year + "-" + month + "-01",
    end: year + "-" + month + "-" + String(lastDay).padStart(2, "0"),
  };
}

function rangeFromQuery(req: NextApiRequest) {
  const period = String(req.query.period || "this_year");

  if (period === "this_month") return thisMonthRange();

  if (period === "custom") {
    return {
      start: String(req.query.start || ""),
      end: String(req.query.end || ""),
    };
  }

  if (period === "all") {
    return {
      start: "",
      end: "",
    };
  }

  return thisYearRange();
}

function inRange(dateValue: any, start: string, end: string) {
  const date = isoDate(dateValue);

  if (!date) return false;
  if (start && date < start) return false;
  if (end && date > end) return false;

  return true;
}

function statusLabel(status: any) {
  switch (String(status || "")) {
    case "paid": return "Betald";
    case "sent": return "Skickad";
    case "draft": return "Utkast";
    case "overdue": return "Förfallen";
    case "received": return "Mottagen";
    case "approved": return "Godkänd";
    case "unpaid": return "Obetald";
    case "archived": return "Arkiverad";
    case "reconciled": return "Avstämd";
    default: return status || "";
  }
}

function buildRows({
  customerInvoices,
  supplierInvoices,
  transactions,
}: {
  customerInvoices: any[];
  supplierInvoices: any[];
  transactions: any[];
}) {
  const rows: any[] = [];

  for (const invoice of customerInvoices || []) {
    rows.push({
      date: isoDate(invoice.invoice_date),
      source: "Kundfaktura",
      direction: "Intäkt",
      number: invoice.invoice_number || "",
      ocr: invoice.ocr_number || "",
      name: invoice.customer_name || "",
      description: "Kundfaktura " + (invoice.invoice_number || ""),
      account: invoice.accounting_account || "3010",
      vat_account: n(invoice.vat_amount) > 0 ? "2631" : "",
      net_amount: n(invoice.subtotal_excl_vat),
      vat_amount: n(invoice.vat_amount),
      gross_amount: n(invoice.total_amount),
      paid_amount: n(invoice.paid_amount),
      unpaid_amount: n(invoice.unpaid_amount),
      status: statusLabel(invoice.status),
      reference: invoice.payment_reference || invoice.ocr_number || "",
      link: "/admin/ekonomi/fakturor/" + invoice.id,
    });
  }

  for (const invoice of supplierInvoices || []) {
    rows.push({
      date: isoDate(invoice.invoice_date),
      source: "Leverantörsfaktura",
      direction: "Kostnad",
      number: invoice.supplier_invoice_number || "",
      ocr: invoice.ocr_number || "",
      name: invoice.supplier_name || "",
      description: "Leverantörsfaktura " + (invoice.supplier_invoice_number || ""),
      account: invoice.default_cost_account || "4010",
      vat_account: n(invoice.vat_amount) > 0 ? "2641" : "",
      net_amount: -Math.abs(n(invoice.subtotal_excl_vat)),
      vat_amount: -Math.abs(n(invoice.vat_amount)),
      gross_amount: -Math.abs(n(invoice.total_amount)),
      paid_amount: n(invoice.paid_amount),
      unpaid_amount: n(invoice.unpaid_amount),
      status: statusLabel(invoice.status),
      reference: invoice.payment_reference || invoice.ocr_number || "",
      link: "/admin/ekonomi/leverantorsreskontra/" + invoice.id,
    });
  }

  for (const tx of transactions || []) {
    const isExpense = String(tx.transaction_type || "") === "expense";

    rows.push({
      date: isoDate(tx.transaction_date),
      source: "Transaktion",
      direction: isExpense ? "Kostnad" : "Intäkt",
      number: tx.id || "",
      ocr: "",
      name: tx.customer_supplier_name || "",
      description: tx.title || tx.description || "",
      account: tx.accounting_account || "",
      vat_account: tx.vat_account || "",
      net_amount: isExpense ? -Math.abs(n(tx.net_amount)) : n(tx.net_amount),
      vat_amount: isExpense ? -Math.abs(n(tx.vat_amount)) : n(tx.vat_amount),
      gross_amount: isExpense ? -Math.abs(n(tx.gross_amount)) : n(tx.gross_amount),
      paid_amount: n(tx.gross_amount),
      unpaid_amount: 0,
      status: statusLabel(tx.status),
      reference: tx.reference || "",
      link: "",
    });
  }

  return rows.sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function buildSummary(rows: any[]) {
  const revenueNet = rows
    .filter((row) => row.direction === "Intäkt")
    .reduce((sum, row) => sum + Math.abs(n(row.net_amount)), 0);

  const costNet = rows
    .filter((row) => row.direction === "Kostnad")
    .reduce((sum, row) => sum + Math.abs(n(row.net_amount)), 0);

  const outgoingVat = rows
    .filter((row) => row.direction === "Intäkt")
    .reduce((sum, row) => sum + Math.abs(n(row.vat_amount)), 0);

  const incomingVat = rows
    .filter((row) => row.direction === "Kostnad")
    .reduce((sum, row) => sum + Math.abs(n(row.vat_amount)), 0);

  const result = revenueNet - costNet;
  const vatToPay = outgoingVat - incomingVat;

  return {
    rowCount: rows.length,
    revenueNet: Number(revenueNet.toFixed(2)),
    costNet: Number(costNet.toFixed(2)),
    result: Number(result.toFixed(2)),
    outgoingVat: Number(outgoingVat.toFixed(2)),
    incomingVat: Number(incomingVat.toFixed(2)),
    vatToPay: Number(vatToPay.toFixed(2)),
  };
}

function toCsv(rows: any[], summary: any, range: any) {
  const header = [
    "Datum",
    "Källa",
    "Typ",
    "Nummer",
    "OCR/Referens",
    "Kund/Leverantör",
    "Beskrivning",
    "Konto",
    "Momskonto",
    "Netto exkl moms",
    "Moms",
    "Brutto inkl moms",
    "Betalt",
    "Obetalt",
    "Status",
    "Länk",
  ];

  const csvRows = [
    ["Bokföringsunderlag Helsingbuss"],
    ["Period", range.start || "Alla", range.end || "Alla"],
    [],
    ["Sammanställning"],
    ["Intäkter exkl moms", csvMoney(summary.revenueNet)],
    ["Kostnader exkl moms", csvMoney(summary.costNet)],
    ["Resultat exkl moms", csvMoney(summary.result)],
    ["Utgående moms", csvMoney(summary.outgoingVat)],
    ["Ingående moms", csvMoney(summary.incomingVat)],
    ["Moms att betala/få tillbaka", csvMoney(summary.vatToPay)],
    [],
    header,
    ...rows.map((row) => [
      row.date,
      row.source,
      row.direction,
      row.number,
      row.ocr || row.reference,
      row.name,
      row.description,
      row.account,
      row.vat_account,
      csvMoney(row.net_amount),
      csvMoney(row.vat_amount),
      csvMoney(row.gross_amount),
      csvMoney(row.paid_amount),
      csvMoney(row.unpaid_amount),
      row.status,
      row.link,
    ]),
  ];

  return "sep=;\n" + csvRows.map((row) => row.map(csvEscape).join(";")).join("\n");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();
    const range = rangeFromQuery(req);
    const format = String(req.query.format || "json");

    const { data: customerRaw, error: customerError } = await supabase
      .from("finance_invoices")
      .select("*")
      .order("invoice_date", { ascending: true })
      .limit(5000);

    if (customerError) throw customerError;

    const { data: supplierRaw, error: supplierError } = await supabase
      .from("supplier_invoices")
      .select("*")
      .order("invoice_date", { ascending: true })
      .limit(5000);

    if (supplierError) throw supplierError;

    const { data: transactionsRaw, error: transactionsError } = await supabase
      .from("finance_transactions")
      .select("*")
      .order("transaction_date", { ascending: true })
      .limit(5000);

    if (transactionsError) throw transactionsError;

    const customerInvoices = (customerRaw || []).filter((row) =>
      inRange(row.invoice_date || row.created_at, range.start, range.end)
    );

    const supplierInvoices = (supplierRaw || []).filter((row) =>
      inRange(row.invoice_date || row.created_at, range.start, range.end)
    );

    const transactions = (transactionsRaw || []).filter((row) =>
      inRange(row.transaction_date || row.created_at, range.start, range.end)
    );

    const rows = buildRows({
      customerInvoices,
      supplierInvoices,
      transactions,
    });

    const summary = buildSummary(rows);

    if (format === "csv") {
      const csv = toCsv(rows, summary, range);
      const filename = "bokforingsunderlag-" + (range.start || "alla") + "-till-" + (range.end || "alla") + ".csv";

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="' + filename + '"');

      return res.status(200).send("\uFEFF" + csv);
    }

    return res.status(200).json({
      ok: true,
      range,
      summary,
      rows,
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/bokforingsunderlag error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte skapa bokföringsunderlag.",
    });
  }
}
