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
  const year = new Date().getFullYear();

  return {
    start: year + "-01-01",
    end: year + "-12-31",
  };
}

function rangeFromQuery(req: NextApiRequest) {
  const period = String(req.query.period || "this_year");

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

function areaConfig(area: string) {
  if (area === "sundra") {
    return {
      area,
      label: "Sundra",
    };
  }

  if (area === "shuttle") {
    return {
      area,
      label: "Shuttle",
    };
  }

  return {
    area: "bestallningstrafik",
    label: "Beställningstrafik",
  };
}

function rowText(row: any) {
  return Object.values(row || {})
    .map((value) => String(value ?? ""))
    .join(" ")
    .toLowerCase();
}

function areaName(row: any) {
  const directArea = String(
    row?.business_area ||
      row?.businessArea ||
      row?.area ||
      row?.product_area ||
      row?.sales_area ||
      ""
  ).toLowerCase();

  if (
    directArea.includes("shuttle") ||
    directArea.includes("airport") ||
    directArea.includes("flygbuss")
  ) {
    return "Shuttle";
  }

  if (
    directArea.includes("sundra") ||
    directArea.includes("dagsresa") ||
    directArea.includes("paketresa")
  ) {
    return "Sundra";
  }

  if (
    directArea.includes("beställning") ||
    directArea.includes("bestallning") ||
    directArea.includes("charter") ||
    directArea.includes("uppdrag")
  ) {
    return "Beställningstrafik";
  }

  const text = rowText(row);

  if (
    text.includes("shuttle") ||
    text.includes("airport shuttle") ||
    text.includes("flygbuss") ||
    text.includes("airport") ||
    text.includes("ängelholm airport") ||
    text.includes("angelholm airport") ||
    text.includes("malmö airport") ||
    text.includes("malmo airport")
  ) {
    return "Shuttle";
  }

  if (
    text.includes("sundra") ||
    text.includes("sundra resor") ||
    text.includes("dagsresa") ||
    text.includes("paketresa") ||
    text.includes("lucy") ||
    text.includes("allsång") ||
    text.includes("allsang") ||
    text.includes("vallarna") ||
    text.includes("gekås") ||
    text.includes("gekas") ||
    text.includes("ullared") ||
    text.includes("liseberg") ||
    text.includes("legoland") ||
    text.includes("lalandia") ||
    text.includes("kryssning")
  ) {
    return "Sundra";
  }

  return "Beställningstrafik";
}

function matchesArea(row: any, config: any) {
  return areaName(row) === config.label;
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
    default: return status || "";
  }
}

function isPaid(status: any) {
  return String(status || "").toLowerCase() === "paid";
}

function buildRows(customerInvoices: any[], supplierInvoices: any[], transactions: any[], config: any) {
  const rows: any[] = [];

  for (const invoice of customerInvoices) {
    rows.push({
      id: invoice.id,
      date: isoDate(invoice.invoice_date || invoice.created_at),
      type: "Kundfaktura",
      direction: "Intäkt",
      number: invoice.invoice_number || "",
      name: invoice.customer_name || "",
      description: invoice.notes || invoice.invoice_reference || "Kundfaktura",
      net_amount: n(invoice.subtotal_excl_vat),
      vat_amount: n(invoice.vat_amount),
      gross_amount: n(invoice.total_amount),
      paid_amount: isPaid(invoice.status) ? n(invoice.total_amount) : n(invoice.paid_amount),
      unpaid_amount: isPaid(invoice.status) ? 0 : n(invoice.unpaid_amount || invoice.total_amount),
      status: statusLabel(invoice.status),
      href: "/admin/ekonomi/fakturor/" + invoice.id,
    });
  }

  for (const invoice of supplierInvoices) {
    rows.push({
      id: invoice.id,
      date: isoDate(invoice.invoice_date || invoice.created_at),
      type: "Leverantörsfaktura",
      direction: "Kostnad",
      number: invoice.supplier_invoice_number || "",
      name: invoice.supplier_name || "",
      description: invoice.notes || invoice.invoice_reference || "Leverantörsfaktura",
      net_amount: -Math.abs(n(invoice.subtotal_excl_vat)),
      vat_amount: -Math.abs(n(invoice.vat_amount)),
      gross_amount: -Math.abs(n(invoice.total_amount)),
      paid_amount: isPaid(invoice.status) ? n(invoice.total_amount) : n(invoice.paid_amount),
      unpaid_amount: isPaid(invoice.status) ? 0 : n(invoice.unpaid_amount || invoice.total_amount),
      status: statusLabel(invoice.status),
      href: "/admin/ekonomi/leverantorsreskontra/" + invoice.id,
    });
  }

  for (const tx of transactions) {
    const isExpense = String(tx.transaction_type || "") === "expense";

    rows.push({
      id: tx.id,
      date: isoDate(tx.transaction_date || tx.created_at),
      type: "Transaktion",
      direction: isExpense ? "Kostnad" : "Intäkt",
      number: "",
      name: tx.customer_supplier_name || "",
      description: tx.title || tx.description || config.label,
      net_amount: isExpense ? -Math.abs(n(tx.net_amount)) : n(tx.net_amount),
      vat_amount: isExpense ? -Math.abs(n(tx.vat_amount)) : n(tx.vat_amount),
      gross_amount: isExpense ? -Math.abs(n(tx.gross_amount)) : n(tx.gross_amount),
      paid_amount: n(tx.gross_amount),
      unpaid_amount: 0,
      status: statusLabel(tx.status),
      href: "",
    });
  }

  return rows.sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function buildSummary(rows: any[]) {
  const revenue = rows
    .filter((row) => row.direction === "Intäkt")
    .reduce((sum, row) => sum + Math.abs(n(row.net_amount)), 0);

  const costs = rows
    .filter((row) => row.direction === "Kostnad")
    .reduce((sum, row) => sum + Math.abs(n(row.net_amount)), 0);

  const outgoingVat = rows
    .filter((row) => row.direction === "Intäkt")
    .reduce((sum, row) => sum + Math.abs(n(row.vat_amount)), 0);

  const incomingVat = rows
    .filter((row) => row.direction === "Kostnad")
    .reduce((sum, row) => sum + Math.abs(n(row.vat_amount)), 0);

  const unpaidCustomer = rows
    .filter((row) => row.type === "Kundfaktura")
    .reduce((sum, row) => sum + Math.abs(n(row.unpaid_amount)), 0);

  const unpaidSupplier = rows
    .filter((row) => row.type === "Leverantörsfaktura")
    .reduce((sum, row) => sum + Math.abs(n(row.unpaid_amount)), 0);

  const result = revenue - costs;
  const marginPercent = revenue > 0 ? (result / revenue) * 100 : 0;

  return {
    rowCount: rows.length,
    revenue: Number(revenue.toFixed(2)),
    costs: Number(costs.toFixed(2)),
    result: Number(result.toFixed(2)),
    marginPercent: Number(marginPercent.toFixed(1)),
    outgoingVat: Number(outgoingVat.toFixed(2)),
    incomingVat: Number(incomingVat.toFixed(2)),
    vatNet: Number((outgoingVat - incomingVat).toFixed(2)),
    unpaidCustomer: Number(unpaidCustomer.toFixed(2)),
    unpaidSupplier: Number(unpaidSupplier.toFixed(2)),
  };
}

function toCsv(config: any, range: any, rows: any[], summary: any) {
  const csvRows = [
    ["Avstämning", config.label],
    ["Period", range.start || "Alla", range.end || "Alla"],
    [],
    ["Sammanställning"],
    ["Intäkter exkl moms", csvMoney(summary.revenue)],
    ["Kostnader exkl moms", csvMoney(summary.costs)],
    ["Resultat exkl moms", csvMoney(summary.result)],
    ["Marginal %", String(summary.marginPercent).replace(".", ",")],
    ["Utgående moms", csvMoney(summary.outgoingVat)],
    ["Ingående moms", csvMoney(summary.incomingVat)],
    ["Moms netto", csvMoney(summary.vatNet)],
    ["Obetalda kundfakturor", csvMoney(summary.unpaidCustomer)],
    ["Obetalda leverantörsfakturor", csvMoney(summary.unpaidSupplier)],
    [],
    ["Datum", "Typ", "Riktning", "Nummer", "Namn", "Beskrivning", "Netto", "Moms", "Brutto", "Betalt", "Obetalt", "Status", "Länk"],
    ...rows.map((row) => [
      row.date,
      row.type,
      row.direction,
      row.number,
      row.name,
      row.description,
      csvMoney(row.net_amount),
      csvMoney(row.vat_amount),
      csvMoney(row.gross_amount),
      csvMoney(row.paid_amount),
      csvMoney(row.unpaid_amount),
      row.status,
      row.href,
    ]),
  ];

  return "sep=;\n" + csvRows.map((row) => row.map(csvEscape).join(";")).join("\n");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const area = String(req.query.area || "bestallningstrafik");
    const config = areaConfig(area);
    const range = rangeFromQuery(req);
    const format = String(req.query.format || "json");

    const supabase = getSupabase();

    const { data: customerRaw, error: customerError } = await supabase
      .from("finance_invoices")
      .select("*")
      .limit(5000);

    if (customerError) throw customerError;

    const { data: supplierRaw, error: supplierError } = await supabase
      .from("supplier_invoices")
      .select("*")
      .limit(5000);

    if (supplierError) throw supplierError;

    const { data: transactionRaw, error: transactionError } = await supabase
      .from("finance_transactions")
      .select("*")
      .limit(5000);

    if (transactionError) throw transactionError;

    const customerInvoices = (customerRaw || [])
      .filter((row) => inRange(row.invoice_date || row.created_at, range.start, range.end))
      .filter((row) => matchesArea(row, config));

    const supplierInvoices = (supplierRaw || [])
      .filter((row) => inRange(row.invoice_date || row.created_at, range.start, range.end))
      .filter((row) => matchesArea(row, config));

    const transactions = (transactionRaw || [])
      .filter((row) => inRange(row.transaction_date || row.created_at, range.start, range.end))
      .filter((row) => matchesArea(row, config));

    const rows = buildRows(customerInvoices, supplierInvoices, transactions, config);
    const summary = buildSummary(rows);

    if (format === "csv") {
      const csv = toCsv(config, range, rows, summary);
      const filename = "avstamning-" + config.area + ".csv";

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="' + filename + '"');

      return res.status(200).send("\uFEFF" + csv);
    }

    return res.status(200).json({
      ok: true,
      area: config.area,
      label: config.label,
      range,
      summary,
      rows,
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/avstamning/[area] error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hämta avstämningen.",
    });
  }
}
