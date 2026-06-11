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

function currentYear() {
  return new Date().getFullYear();
}

function thisYearRange() {
  const year = currentYear();

  return {
    start: year + "-01-01",
    end: year + "-12-31",
  };
}

function rangeFromQuery(req: NextApiRequest) {
  const period = String(req.query.period || "this_year");

  if (period === "this_month") {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();

    return {
      start: year + "-" + month + "-01",
      end: year + "-" + month + "-" + String(lastDay).padStart(2, "0"),
    };
  }

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

function inRange(value: any, start: string, end: string) {
  const date = isoDate(value);

  if (!date) return false;
  if (start && date < start) return false;
  if (end && date > end) return false;

  return true;
}

function monthKey(value: any) {
  const date = isoDate(value);

  return date ? date.slice(0, 7) : "Okänt";
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

function statusLabel(status: any) {
  switch (String(status || "")) {
    case "paid": return "Betald";
    case "sent": return "Skickad";
    case "draft": return "Utkast";
    case "overdue": return "Förfallen";
    case "cancelled": return "Avbokad";
    case "refunded": return "Återbetald";
    case "booked": return "Bokad";
    case "confirmed": return "Bekräftad";
    default: return status || "";
  }
}

function isPaid(status: any) {
  return String(status || "").toLowerCase() === "paid";
}

function isArchived(status: any) {
  return String(status || "").toLowerCase() === "archived";
}

function isIncomeTransaction(row: any) {
  const type = String(row.transaction_type || row.type || "").toLowerCase();

  if (type === "expense" || type === "cost") return false;

  const gross = n(row.gross_amount || row.amount || row.total_amount || 0);

  return gross >= 0;
}

function addMap(map: Map<string, number>, key: string, amount: number) {
  const safeKey = key || "Okänt";
  map.set(safeKey, Number((n(map.get(safeKey) || 0) + n(amount)).toFixed(2)));
}

function sortMap(map: Map<string, number>, limit = 10) {
  return Array.from(map.entries())
    .map(([label, value]) => ({
      label,
      value: Number(n(value).toFixed(2)),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

async function safeSelect(supabase: any, table: string) {
  const { data, error } = await supabase.from(table).select("*").limit(5000);

  if (error) {
    return {
      data: [],
      warning: table + ": " + (error.message || "kunde inte hämtas"),
    };
  }

  return {
    data: data || [],
    warning: "",
  };
}

function productName(row: any) {
  return (
    row.product_name ||
    row.product_title ||
    row.trip_title ||
    row.route_name ||
    row.line_name ||
    row.description ||
    row.title ||
    row.name ||
    "Okänd produkt"
  );
}

function descriptionFromInvoice(row: any) {
  return (
    row.notes ||
    row.invoice_reference ||
    row.linked_order_reference ||
    row.ocr_number ||
    "Kundfaktura"
  );
}

function buildIncomeRows(invoices: any[], transactions: any[], range: any) {
  const rows: any[] = [];

  for (const invoice of invoices || []) {
    const date = invoice.invoice_date || invoice.created_at;

    if (!inRange(date, range.start, range.end)) continue;
    if (isArchived(invoice.status)) continue;

    const net = n(invoice.subtotal_excl_vat);
    const vat = n(invoice.vat_amount);
    const gross = n(invoice.total_amount);
    const unpaid = isPaid(invoice.status) ? 0 : n(invoice.unpaid_amount || invoice.total_amount);

    rows.push({
      id: invoice.id,
      date: isoDate(date),
      source: "Kundfaktura",
      area: areaName(invoice),
      customer: invoice.customer_name || "Okänd kund",
      description: descriptionFromInvoice(invoice),
      invoice_number: invoice.invoice_number || "",
      net_amount: net,
      vat_amount: vat,
      gross_amount: gross,
      paid_amount: isPaid(invoice.status) ? gross : n(invoice.paid_amount),
      unpaid_amount: unpaid,
      status: statusLabel(invoice.status),
      href: "/admin/ekonomi/fakturor/" + invoice.id,
    });
  }

  for (const tx of transactions || []) {
    if (tx.invoice_id || tx.customer_invoice_id || tx.supplier_invoice_id) continue;
    if (!isIncomeTransaction(tx)) continue;

    const date = tx.transaction_date || tx.created_at;

    if (!inRange(date, range.start, range.end)) continue;

    const net = Math.abs(n(tx.net_amount || tx.amount || tx.gross_amount));
    const vat = Math.abs(n(tx.vat_amount));
    const gross = Math.abs(n(tx.gross_amount || tx.amount || tx.total_amount || net + vat));

    rows.push({
      id: tx.id,
      date: isoDate(date),
      source: "Transaktion",
      area: areaName(tx),
      customer: tx.customer_supplier_name || tx.customer_name || "Okänd",
      description: tx.title || tx.description || "Intäkt",
      invoice_number: tx.reference || "",
      net_amount: net,
      vat_amount: vat,
      gross_amount: gross,
      paid_amount: gross,
      unpaid_amount: 0,
      status: statusLabel(tx.status || "paid"),
      href: "",
    });
  }

  return rows.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function buildProductRows(lines: any[], invoices: any[], range: any) {
  const invoiceById = new Map((invoices || []).map((invoice: any) => [String(invoice.id), invoice]));
  const rows: any[] = [];

  for (const line of lines || []) {
    const invoice =
      invoiceById.get(String(line.invoice_id || line.finance_invoice_id || line.customer_invoice_id || "")) ||
      null;

    const date = invoice?.invoice_date || line.created_at;

    if (!inRange(date, range.start, range.end)) continue;
    if (invoice && isArchived(invoice.status)) continue;

    const net = n(line.line_total_excl_vat || line.subtotal_excl_vat || line.net_amount || 0);
    const gross = n(line.line_total_incl_vat || line.total_amount || line.gross_amount || net);
    const amount = gross || net;

    if (amount <= 0) continue;

    rows.push({
      product: productName(line),
      area: areaName({ ...line, invoice }),
      amount,
      quantity: Number(line.quantity || 1) || 1,
    });
  }

  return rows;
}

function buildSummary(rows: any[]) {
  const net = rows.reduce((sum, row) => sum + n(row.net_amount), 0);
  const vat = rows.reduce((sum, row) => sum + n(row.vat_amount), 0);
  const gross = rows.reduce((sum, row) => sum + n(row.gross_amount), 0);
  const paid = rows.reduce((sum, row) => sum + n(row.paid_amount), 0);
  const unpaid = rows.reduce((sum, row) => sum + n(row.unpaid_amount), 0);

  const paidRows = rows.filter((row) => n(row.unpaid_amount) <= 0);
  const unpaidRows = rows.filter((row) => n(row.unpaid_amount) > 0);

  return {
    rowCount: rows.length,
    net: Number(net.toFixed(2)),
    vat: Number(vat.toFixed(2)),
    gross: Number(gross.toFixed(2)),
    paid: Number(paid.toFixed(2)),
    unpaid: Number(unpaid.toFixed(2)),
    paidRows: paidRows.length,
    unpaidRows: unpaidRows.length,
  };
}

function buildCharts(rows: any[], productRows: any[]) {
  const byArea = new Map<string, number>();
  const byCustomer = new Map<string, number>();
  const byMonth = new Map<string, number>();
  const byProduct = new Map<string, number>();
  const byStatus = new Map<string, number>();

  for (const row of rows) {
    addMap(byArea, row.area, row.net_amount);
    addMap(byCustomer, row.customer, row.net_amount);
    addMap(byMonth, monthKey(row.date), row.net_amount);
    addMap(byStatus, row.status || "Okänd", row.gross_amount);
  }

  for (const row of productRows) {
    addMap(byProduct, row.product, row.amount);
  }

  return {
    byArea: sortMap(byArea, 10),
    byCustomer: sortMap(byCustomer, 10),
    byMonth: sortMap(byMonth, 24).sort((a, b) => String(a.label).localeCompare(String(b.label))),
    byProduct: sortMap(byProduct, 10),
    byStatus: sortMap(byStatus, 10),
  };
}

function toCsv(rows: any[], summary: any, range: any) {
  const csvRows = [
    ["Intäktsrapport"],
    ["Period", range.start || "Alla", range.end || "Alla"],
    [],
    ["Sammanställning"],
    ["Intäkter exkl moms", csvMoney(summary.net)],
    ["Moms", csvMoney(summary.vat)],
    ["Intäkter inkl moms", csvMoney(summary.gross)],
    ["Betalt", csvMoney(summary.paid)],
    ["Obetalt", csvMoney(summary.unpaid)],
    [],
    ["Datum", "Källa", "Område", "Kund", "Beskrivning", "Faktura/referens", "Netto", "Moms", "Brutto", "Betalt", "Obetalt", "Status", "Länk"],
    ...rows.map((row) => [
      row.date,
      row.source,
      row.area,
      row.customer,
      row.description,
      row.invoice_number,
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
    const supabase = getSupabase();
    const range = rangeFromQuery(req);
    const format = String(req.query.format || "json");
    const areaFilter = String(req.query.area || "all");

    const warnings: string[] = [];

    const invoicesResult = await safeSelect(supabase, "finance_invoices");
    const transactionsResult = await safeSelect(supabase, "finance_transactions");
    const linesResult = await safeSelect(supabase, "finance_invoice_lines");

    for (const result of [invoicesResult, transactionsResult, linesResult]) {
      if (result.warning) warnings.push(result.warning);
    }

    let rows = buildIncomeRows(invoicesResult.data, transactionsResult.data, range);
    let productRows = buildProductRows(linesResult.data, invoicesResult.data, range);

    if (areaFilter !== "all") {
      rows = rows.filter((row) => row.area === areaFilter);
      productRows = productRows.filter((row) => row.area === areaFilter);
    }

    const summary = buildSummary(rows);
    const charts = buildCharts(rows, productRows);

    if (format === "csv") {
      const csv = toCsv(rows, summary, range);
      const filename = "intaktsrapport.csv";

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="' + filename + '"');

      return res.status(200).send("\uFEFF" + csv);
    }

    return res.status(200).json({
      ok: true,
      range,
      areaFilter,
      summary,
      charts,
      rows,
      warnings,
    });
  } catch (error: any) {
    console.error("/api/admin/rapporter-analys/intaktsrapport error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hämta intäktsrapport.",
    });
  }
}
