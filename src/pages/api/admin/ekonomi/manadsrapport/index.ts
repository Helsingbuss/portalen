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
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return String(value || "").slice(0, 10);
  }
}

function monthKey(value: any) {
  const date = isoDate(value);

  if (!date || date.length < 7) return "";

  return date.slice(0, 7);
}

function monthName(key: string) {
  if (!key || key === "total") return "";

  const parts = key.split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return "";
  }

  const date = new Date(year, month - 1, 1);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("sv-SE", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function isPaid(status: any) {
  return String(status || "").toLowerCase() === "paid";
}

function makeEmptyMonth(key: string) {
  return {
    month: key,
    label: monthName(key),

    customerInvoiceCount: 0,
    supplierInvoiceCount: 0,
    transactionCount: 0,

    revenueExVat: 0,
    costExVat: 0,
    resultExVat: 0,

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
  };
}

function addMoney(row: any, key: string, amount: number) {
  row[key] = Number((n(row[key]) + n(amount)).toFixed(2));
}

function buildMonths(year: number) {
  const months: any[] = [];

  for (let i = 1; i <= 12; i++) {
    months.push(makeEmptyMonth(year + "-" + String(i).padStart(2, "0")));
  }

  return months;
}

function sumRows(months: any[]) {
  const total = {
    ...makeEmptyMonth(""),
    month: "total",
    label: "Totalt",
  };

  for (const month of months) {
    for (const key of [
      "customerInvoiceCount",
      "supplierInvoiceCount",
      "transactionCount",
      "revenueExVat",
      "costExVat",
      "resultExVat",
      "outgoingVat",
      "incomingVat",
      "vatToPay",
      "customerGross",
      "supplierGross",
      "customerPaid",
      "customerUnpaid",
      "supplierPaid",
      "supplierUnpaid",
      "cashIn",
      "cashOut",
      "cashNet",
    ]) {
      addMoney(total, key, month[key]);
    }
  }

  return total;
}

function toCsv(months: any[], total: any, year: number) {
  const header = [
    "Månad",
    "Kundfakturor",
    "Leverantörsfakturor",
    "Intäkter exkl moms",
    "Kostnader exkl moms",
    "Resultat exkl moms",
    "Utgående moms",
    "Ingående moms",
    "Moms att betala/få tillbaka",
    "Kundfakturor brutto",
    "Leverantörsfakturor brutto",
    "Kunder betalt",
    "Kunder obetalt",
    "Leverantörer betalt",
    "Leverantörer obetalt",
    "Kassa in",
    "Kassa ut",
    "Kassa netto",
  ];

  const rows = [
    ["Månadsrapport Helsingbuss"],
    ["År", String(year)],
    [],
    header,
    ...months.map((month) => [
      month.label,
      month.customerInvoiceCount,
      month.supplierInvoiceCount,
      csvMoney(month.revenueExVat),
      csvMoney(month.costExVat),
      csvMoney(month.resultExVat),
      csvMoney(month.outgoingVat),
      csvMoney(month.incomingVat),
      csvMoney(month.vatToPay),
      csvMoney(month.customerGross),
      csvMoney(month.supplierGross),
      csvMoney(month.customerPaid),
      csvMoney(month.customerUnpaid),
      csvMoney(month.supplierPaid),
      csvMoney(month.supplierUnpaid),
      csvMoney(month.cashIn),
      csvMoney(month.cashOut),
      csvMoney(month.cashNet),
    ]),
    [],
    [
      total.label,
      total.customerInvoiceCount,
      total.supplierInvoiceCount,
      csvMoney(total.revenueExVat),
      csvMoney(total.costExVat),
      csvMoney(total.resultExVat),
      csvMoney(total.outgoingVat),
      csvMoney(total.incomingVat),
      csvMoney(total.vatToPay),
      csvMoney(total.customerGross),
      csvMoney(total.supplierGross),
      csvMoney(total.customerPaid),
      csvMoney(total.customerUnpaid),
      csvMoney(total.supplierPaid),
      csvMoney(total.supplierUnpaid),
      csvMoney(total.cashIn),
      csvMoney(total.cashOut),
      csvMoney(total.cashNet),
    ],
  ];

  return "sep=;\n" + rows.map((row) => row.map(csvEscape).join(";")).join("\n");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    const currentYear = new Date().getFullYear();
    const year = Number.parseInt(String(req.query.year || currentYear), 10) || currentYear;
    const format = String(req.query.format || "json");

    const months = buildMonths(year);
    const byMonth = new Map(months.map((month) => [month.month, month]));

    const start = year + "-01-01";
    const end = year + "-12-31";

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
      const key = monthKey(invoice.invoice_date || invoice.created_at);
      const row = byMonth.get(key);

      if (!row) continue;

      row.customerInvoiceCount += 1;

      addMoney(row, "revenueExVat", invoice.subtotal_excl_vat);
      addMoney(row, "outgoingVat", invoice.vat_amount);
      addMoney(row, "customerGross", invoice.total_amount);

      if (isPaid(invoice.status)) {
        addMoney(row, "customerPaid", invoice.total_amount);
        addMoney(row, "cashIn", invoice.total_amount);
      } else {
        addMoney(row, "customerUnpaid", invoice.unpaid_amount || invoice.total_amount);
      }
    }

    for (const invoice of supplierInvoices || []) {
      const key = monthKey(invoice.invoice_date || invoice.created_at);
      const row = byMonth.get(key);

      if (!row) continue;

      row.supplierInvoiceCount += 1;

      addMoney(row, "costExVat", invoice.subtotal_excl_vat);
      addMoney(row, "incomingVat", invoice.vat_amount);
      addMoney(row, "supplierGross", invoice.total_amount);

      if (isPaid(invoice.status)) {
        addMoney(row, "supplierPaid", invoice.total_amount);
        addMoney(row, "cashOut", invoice.total_amount);
      } else {
        addMoney(row, "supplierUnpaid", invoice.unpaid_amount || invoice.total_amount);
      }
    }

    // Övriga transaktioner som inte redan är kopplade till kund- eller leverantörsfaktura.
    // Detta minskar risken för dubbelräkning.
    for (const tx of transactions || []) {
      if (tx.invoice_id || tx.supplier_invoice_id) continue;

      const key = monthKey(tx.transaction_date || tx.created_at);
      const row = byMonth.get(key);

      if (!row) continue;

      row.transactionCount += 1;

      const isExpense = String(tx.transaction_type || "") === "expense";

      if (isExpense) {
        addMoney(row, "costExVat", Math.abs(n(tx.net_amount)));
        addMoney(row, "incomingVat", Math.abs(n(tx.vat_amount)));
        addMoney(row, "cashOut", Math.abs(n(tx.gross_amount)));
      } else {
        addMoney(row, "revenueExVat", Math.abs(n(tx.net_amount)));
        addMoney(row, "outgoingVat", Math.abs(n(tx.vat_amount)));
        addMoney(row, "cashIn", Math.abs(n(tx.gross_amount)));
      }
    }

    for (const month of months) {
      month.resultExVat = Number((n(month.revenueExVat) - n(month.costExVat)).toFixed(2));
      month.vatToPay = Number((n(month.outgoingVat) - n(month.incomingVat)).toFixed(2));
      month.cashNet = Number((n(month.cashIn) - n(month.cashOut)).toFixed(2));
    }

    const total = sumRows(months);

    if (format === "csv") {
      const csv = toCsv(months, total, year);
      const filename = "manadsrapport-" + year + ".csv";

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="' + filename + '"');

      return res.status(200).send("\uFEFF" + csv);
    }

    return res.status(200).json({
      ok: true,
      year,
      months,
      total,
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/manadsrapport error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte skapa månadsrapport.",
    });
  }
}
