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

function isoDate(value: any) {
  if (!value) return "";

  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function monthNumber(value: any) {
  const date = isoDate(value);

  if (!date) return 0;

  return Number(date.slice(5, 7));
}

function quarterFromDate(value: any) {
  const month = monthNumber(value);

  if (month >= 1 && month <= 3) return "Q1";
  if (month >= 4 && month <= 6) return "Q2";
  if (month >= 7 && month <= 9) return "Q3";
  if (month >= 10 && month <= 12) return "Q4";

  return "";
}

function isPaid(status: any) {
  return String(status || "").toLowerCase() === "paid";
}

function isArchived(status: any) {
  return String(status || "").toLowerCase() === "archived";
}

function emptyQuarter(key: string) {
  return {
    quarter: key,
    revenueExVat: 0,
    costExVat: 0,
    resultExVat: 0,
    outgoingVat: 0,
    incomingVat: 0,
    vatToPay: 0,
    customerGross: 0,
    supplierGross: 0,
    customerUnpaid: 0,
    supplierUnpaid: 0,
    cashIn: 0,
    cashOut: 0,
    cashNet: 0,
    customerInvoiceCount: 0,
    supplierInvoiceCount: 0,
  };
}

function add(row: any, key: string, value: any) {
  row[key] = Number((n(row[key]) + n(value)).toFixed(2));
}

function makeSummary() {
  return {
    revenueExVat: 0,
    costExVat: 0,
    resultExVat: 0,
    marginPercent: 0,

    outgoingVat: 0,
    incomingVat: 0,
    vatToPay: 0,

    customerGross: 0,
    supplierGross: 0,

    customerPaid: 0,
    customerUnpaid: 0,

    supplierPaid: 0,
    supplierUnpaid: 0,

    cashIn: 0,
    cashOut: 0,
    cashNet: 0,

    customerInvoiceCount: 0,
    supplierInvoiceCount: 0,
    transactionCount: 0,
  };
}

function finalizeRow(row: any) {
  row.resultExVat = Number((n(row.revenueExVat) - n(row.costExVat)).toFixed(2));
  row.vatToPay = Number((n(row.outgoingVat) - n(row.incomingVat)).toFixed(2));
  row.cashNet = Number((n(row.cashIn) - n(row.cashOut)).toFixed(2));
  row.marginPercent =
    n(row.revenueExVat) > 0
      ? Number(((n(row.resultExVat) / n(row.revenueExVat)) * 100).toFixed(1))
      : 0;

  return row;
}

function toCsv(year: number, summary: any, quarters: any[]) {
  const rows = [
    ["Årsöversikt Helsingbuss"],
    ["År", String(year)],
    [],
    ["Sammanställning"],
    ["Intäkter exkl moms", csvMoney(summary.revenueExVat)],
    ["Kostnader exkl moms", csvMoney(summary.costExVat)],
    ["Resultat exkl moms", csvMoney(summary.resultExVat)],
    ["Marginal %", String(summary.marginPercent).replace(".", ",")],
    ["Utgående moms", csvMoney(summary.outgoingVat)],
    ["Ingående moms", csvMoney(summary.incomingVat)],
    ["Moms att betala/få tillbaka", csvMoney(summary.vatToPay)],
    ["Kassa in", csvMoney(summary.cashIn)],
    ["Kassa ut", csvMoney(summary.cashOut)],
    ["Kassa netto", csvMoney(summary.cashNet)],
    ["Kunder obetalt", csvMoney(summary.customerUnpaid)],
    ["Leverantörer obetalt", csvMoney(summary.supplierUnpaid)],
    [],
    [
      "Kvartal",
      "Intäkter exkl moms",
      "Kostnader exkl moms",
      "Resultat exkl moms",
      "Utgående moms",
      "Ingående moms",
      "Moms netto",
      "Kassa in",
      "Kassa ut",
      "Kassa netto",
      "Kundfakturor",
      "Leverantörsfakturor",
    ],
    ...quarters.map((q) => [
      q.quarter,
      csvMoney(q.revenueExVat),
      csvMoney(q.costExVat),
      csvMoney(q.resultExVat),
      csvMoney(q.outgoingVat),
      csvMoney(q.incomingVat),
      csvMoney(q.vatToPay),
      csvMoney(q.cashIn),
      csvMoney(q.cashOut),
      csvMoney(q.cashNet),
      q.customerInvoiceCount,
      q.supplierInvoiceCount,
    ]),
  ];

  return "sep=;\n" + rows.map((row) => row.map(csvEscape).join(";")).join("\n");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    const currentYear = new Date().getFullYear();
    const year = Number.parseInt(String(req.query.year || currentYear), 10) || currentYear;
    const format = String(req.query.format || "json");

    const start = year + "-01-01";
    const end = year + "-12-31";

    const quarters = ["Q1", "Q2", "Q3", "Q4"].map(emptyQuarter);
    const quarterMap = new Map(quarters.map((q) => [q.quarter, q]));

    const summary = makeSummary();

    const { data: customerInvoices, error: customerError } = await supabase
      .from("finance_invoices")
      .select("*")
      .gte("invoice_date", start)
      .lte("invoice_date", end)
      .limit(5000);

    if (customerError) throw customerError;

    const { data: supplierInvoices, error: supplierError } = await supabase
      .from("supplier_invoices")
      .select("*")
      .gte("invoice_date", start)
      .lte("invoice_date", end)
      .limit(5000);

    if (supplierError) throw supplierError;

    const { data: transactions, error: transactionsError } = await supabase
      .from("finance_transactions")
      .select("*")
      .gte("transaction_date", start)
      .lte("transaction_date", end)
      .limit(5000);

    if (transactionsError) throw transactionsError;

    for (const invoice of customerInvoices || []) {
      if (isArchived(invoice.status)) continue;

      const quarter = quarterMap.get(quarterFromDate(invoice.invoice_date || invoice.created_at));

      summary.customerInvoiceCount += 1;
      add(summary, "revenueExVat", invoice.subtotal_excl_vat);
      add(summary, "outgoingVat", invoice.vat_amount);
      add(summary, "customerGross", invoice.total_amount);

      if (isPaid(invoice.status)) {
        add(summary, "customerPaid", invoice.total_amount);
        add(summary, "cashIn", invoice.total_amount);
      } else {
        add(summary, "customerUnpaid", invoice.unpaid_amount || invoice.total_amount);
      }

      if (quarter) {
        quarter.customerInvoiceCount += 1;
        add(quarter, "revenueExVat", invoice.subtotal_excl_vat);
        add(quarter, "outgoingVat", invoice.vat_amount);
        add(quarter, "customerGross", invoice.total_amount);

        if (isPaid(invoice.status)) {
          add(quarter, "cashIn", invoice.total_amount);
        } else {
          add(quarter, "customerUnpaid", invoice.unpaid_amount || invoice.total_amount);
        }
      }
    }

    for (const invoice of supplierInvoices || []) {
      if (isArchived(invoice.status)) continue;

      const quarter = quarterMap.get(quarterFromDate(invoice.invoice_date || invoice.created_at));

      summary.supplierInvoiceCount += 1;
      add(summary, "costExVat", invoice.subtotal_excl_vat);
      add(summary, "incomingVat", invoice.vat_amount);
      add(summary, "supplierGross", invoice.total_amount);

      if (isPaid(invoice.status)) {
        add(summary, "supplierPaid", invoice.total_amount);
        add(summary, "cashOut", invoice.total_amount);
      } else {
        add(summary, "supplierUnpaid", invoice.unpaid_amount || invoice.total_amount);
      }

      if (quarter) {
        quarter.supplierInvoiceCount += 1;
        add(quarter, "costExVat", invoice.subtotal_excl_vat);
        add(quarter, "incomingVat", invoice.vat_amount);
        add(quarter, "supplierGross", invoice.total_amount);

        if (isPaid(invoice.status)) {
          add(quarter, "cashOut", invoice.total_amount);
        } else {
          add(quarter, "supplierUnpaid", invoice.unpaid_amount || invoice.total_amount);
        }
      }
    }

    for (const tx of transactions || []) {
      if (tx.invoice_id || tx.supplier_invoice_id) continue;

      const quarter = quarterMap.get(quarterFromDate(tx.transaction_date || tx.created_at));
      const isExpense = String(tx.transaction_type || "") === "expense";

      summary.transactionCount += 1;

      if (isExpense) {
        add(summary, "costExVat", Math.abs(n(tx.net_amount)));
        add(summary, "incomingVat", Math.abs(n(tx.vat_amount)));
        add(summary, "cashOut", Math.abs(n(tx.gross_amount)));
      } else {
        add(summary, "revenueExVat", Math.abs(n(tx.net_amount)));
        add(summary, "outgoingVat", Math.abs(n(tx.vat_amount)));
        add(summary, "cashIn", Math.abs(n(tx.gross_amount)));
      }

      if (quarter) {
        if (isExpense) {
          add(quarter, "costExVat", Math.abs(n(tx.net_amount)));
          add(quarter, "incomingVat", Math.abs(n(tx.vat_amount)));
          add(quarter, "cashOut", Math.abs(n(tx.gross_amount)));
        } else {
          add(quarter, "revenueExVat", Math.abs(n(tx.net_amount)));
          add(quarter, "outgoingVat", Math.abs(n(tx.vat_amount)));
          add(quarter, "cashIn", Math.abs(n(tx.gross_amount)));
        }
      }
    }

    finalizeRow(summary);
    quarters.forEach(finalizeRow);

    if (format === "csv") {
      const csv = toCsv(year, summary, quarters);
      const filename = "arsoversikt-" + year + ".csv";

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="' + filename + '"');

      return res.status(200).send("\uFEFF" + csv);
    }

    return res.status(200).json({
      ok: true,
      year,
      summary,
      quarters,
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/arsoversikt error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte skapa årsöversikt.",
    });
  }
}
