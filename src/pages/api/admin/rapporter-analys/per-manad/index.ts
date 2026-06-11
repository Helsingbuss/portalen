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
  const dateText = isoDate(value);

  if (!dateText) return "Okänd månad";

  return dateText.slice(0, 7);
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
    case "received": return "Mottagen";
    case "approved": return "Godkänd";
    case "accepted": return "Accepterad";
    case "confirmed": return "Bekräftad";
    case "cancelled": return "Avbokad";
    default: return status || "";
  }
}

function isPaid(status: any) {
  return String(status || "").toLowerCase() === "paid";
}

function isArchived(status: any) {
  return String(status || "").toLowerCase() === "archived";
}

function isExpenseTransaction(row: any) {
  const type = String(row.transaction_type || row.type || "").toLowerCase();

  if (type === "expense" || type === "cost") return true;
  if (type === "income" || type === "revenue") return false;

  return n(row.gross_amount || row.amount || row.total_amount || 0) < 0;
}

function sourceDate(row: any) {
  return (
    row.invoice_date ||
    row.transaction_date ||
    row.booking_date ||
    row.departure_date ||
    row.travel_date ||
    row.created_at ||
    row.date
  );
}

function sourceName(row: any) {
  return (
    row.customer_name ||
    row.supplier_name ||
    row.customer_supplier_name ||
    row.company_name ||
    row.name ||
    "Okänd"
  );
}

function sourceDescription(row: any) {
  return (
    row.title ||
    row.description ||
    row.notes ||
    row.invoice_reference ||
    row.reference ||
    row.route_name ||
    row.trip_title ||
    "Rad"
  );
}

function sourceNumber(row: any) {
  return (
    row.invoice_number ||
    row.supplier_invoice_number ||
    row.booking_number ||
    row.order_number ||
    row.reference ||
    ""
  );
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

function buildRows(customerInvoices: any[], supplierInvoices: any[], transactions: any[], range: any) {
  const rows: any[] = [];

  for (const invoice of customerInvoices || []) {
    const date = sourceDate(invoice);

    if (!inRange(date, range.start, range.end)) continue;
    if (isArchived(invoice.status)) continue;

    rows.push({
      id: invoice.id,
      date: isoDate(date),
      month: monthKey(date),
      type: "Intäkt",
      source: "Kundfaktura",
      area: areaName(invoice),
      name: sourceName(invoice),
      description: sourceDescription(invoice),
      number: sourceNumber(invoice),
      revenue: n(invoice.subtotal_excl_vat),
      costs: 0,
      result: n(invoice.subtotal_excl_vat),
      paid_amount: isPaid(invoice.status) ? n(invoice.total_amount) : n(invoice.paid_amount),
      unpaid_amount: isPaid(invoice.status) ? 0 : n(invoice.unpaid_amount || invoice.total_amount),
      status: statusLabel(invoice.status),
      href: "/admin/ekonomi/fakturor/" + invoice.id,
    });
  }

  for (const invoice of supplierInvoices || []) {
    const date = sourceDate(invoice);

    if (!inRange(date, range.start, range.end)) continue;
    if (isArchived(invoice.status)) continue;

    rows.push({
      id: invoice.id,
      date: isoDate(date),
      month: monthKey(date),
      type: "Kostnad",
      source: "Leverantörsfaktura",
      area: areaName(invoice),
      name: sourceName(invoice),
      description: sourceDescription(invoice),
      number: sourceNumber(invoice),
      revenue: 0,
      costs: n(invoice.subtotal_excl_vat),
      result: -Math.abs(n(invoice.subtotal_excl_vat)),
      paid_amount: isPaid(invoice.status) ? n(invoice.total_amount) : n(invoice.paid_amount),
      unpaid_amount: isPaid(invoice.status) ? 0 : n(invoice.unpaid_amount || invoice.total_amount),
      status: statusLabel(invoice.status),
      href: "/admin/ekonomi/leverantorsreskontra/" + invoice.id,
    });
  }

  for (const tx of transactions || []) {
    if (tx.invoice_id || tx.customer_invoice_id || tx.supplier_invoice_id) continue;

    const date = sourceDate(tx);

    if (!inRange(date, range.start, range.end)) continue;

    const isExpense = isExpenseTransaction(tx);
    const amount = Math.abs(n(tx.net_amount || tx.amount || tx.gross_amount || tx.total_amount));

    rows.push({
      id: tx.id,
      date: isoDate(date),
      month: monthKey(date),
      type: isExpense ? "Kostnad" : "Intäkt",
      source: "Transaktion",
      area: areaName(tx),
      name: sourceName(tx),
      description: sourceDescription(tx),
      number: sourceNumber(tx),
      revenue: isExpense ? 0 : amount,
      costs: isExpense ? amount : 0,
      result: isExpense ? -amount : amount,
      paid_amount: amount,
      unpaid_amount: 0,
      status: statusLabel(tx.status || "paid"),
      href: "",
    });
  }

  return rows.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function buildMonths(rows: any[]) {
  const map = new Map<string, any>();

  for (const row of rows) {
    const key = row.month || "Okänd månad";
    const existing =
      map.get(key) ||
      {
        month: key,
        rows: 0,
        revenue: 0,
        costs: 0,
        result: 0,
        paid_amount: 0,
        unpaid_amount: 0,
        sundra: 0,
        shuttle: 0,
        bestallningstrafik: 0,
      };

    existing.rows += 1;
    existing.revenue = Number((n(existing.revenue) + n(row.revenue)).toFixed(2));
    existing.costs = Number((n(existing.costs) + n(row.costs)).toFixed(2));
    existing.result = Number((n(existing.revenue) - n(existing.costs)).toFixed(2));
    existing.paid_amount = Number((n(existing.paid_amount) + n(row.paid_amount)).toFixed(2));
    existing.unpaid_amount = Number((n(existing.unpaid_amount) + n(row.unpaid_amount)).toFixed(2));

    if (row.area === "Sundra") existing.sundra += 1;
    if (row.area === "Shuttle") existing.shuttle += 1;
    if (row.area === "Beställningstrafik") existing.bestallningstrafik += 1;

    map.set(key, existing);
  }

  return Array.from(map.values()).sort((a, b) => String(a.month).localeCompare(String(b.month)));
}

function buildSummary(months: any[], rows: any[]) {
  const revenue = months.reduce((sum, row) => sum + n(row.revenue), 0);
  const costs = months.reduce((sum, row) => sum + n(row.costs), 0);
  const result = revenue - costs;
  const paid = months.reduce((sum, row) => sum + n(row.paid_amount), 0);
  const unpaid = months.reduce((sum, row) => sum + n(row.unpaid_amount), 0);
  const bestWeek = [...months].sort((a, b) => n(b.result) - n(a.result))[0] || null;
  const worstWeek = [...months].sort((a, b) => n(a.result) - n(b.result))[0] || null;

  return {
    monthCount: months.length,
    rowCount: rows.length,
    revenue: Number(revenue.toFixed(2)),
    costs: Number(costs.toFixed(2)),
    result: Number(result.toFixed(2)),
    paid: Number(paid.toFixed(2)),
    unpaid: Number(unpaid.toFixed(2)),
    averageRevenuePerMonth:
      months.length > 0 ? Number((revenue / months.length).toFixed(2)) : 0,
    bestWeek,
    worstWeek,
  };
}

function toCsv(months: any[], rows: any[], summary: any, range: any) {
  const csvRows = [
    ["Rapport per månad"],
    ["Period", range.start || "Alla", range.end || "Alla"],
    [],
    ["Sammanställning"],
    ["Antal månader", summary.monthCount],
    ["Antal rader", summary.rowCount],
    ["Intäkter", csvMoney(summary.revenue)],
    ["Kostnader", csvMoney(summary.costs)],
    ["Resultat", csvMoney(summary.result)],
    ["Betalt", csvMoney(summary.paid)],
    ["Obetalt", csvMoney(summary.unpaid)],
    ["Snittintäkt per månad", csvMoney(summary.averageRevenuePerMonth)],
    [],
    ["Månader"],
    ["Månad", "Rader", "Intäkter", "Kostnader", "Resultat", "Betalt", "Obetalt", "Sundra", "Shuttle", "Beställningstrafik"],
    ...months.map((month) => [
      month.month,
      month.rows,
      csvMoney(month.revenue),
      csvMoney(month.costs),
      csvMoney(month.result),
      csvMoney(month.paid_amount),
      csvMoney(month.unpaid_amount),
      month.sundra,
      month.shuttle,
      month.bestallningstrafik,
    ]),
    [],
    ["Underlag"],
    ["Datum", "Månad", "Typ", "Källa", "Område", "Namn", "Beskrivning", "Nummer", "Intäkt", "Kostnad", "Resultat", "Betalt", "Obetalt", "Status", "Länk"],
    ...rows.map((row) => [
      row.date,
      row.month,
      row.type,
      row.source,
      row.area,
      row.name,
      row.description,
      row.number,
      csvMoney(row.revenue),
      csvMoney(row.costs),
      csvMoney(row.result),
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

    const customerResult = await safeSelect(supabase, "finance_invoices");
    const supplierResult = await safeSelect(supabase, "supplier_invoices");
    const transactionResult = await safeSelect(supabase, "finance_transactions");

    for (const result of [customerResult, supplierResult, transactionResult]) {
      if (result.warning) warnings.push(result.warning);
    }

    let rows = buildRows(customerResult.data, supplierResult.data, transactionResult.data, range);

    if (areaFilter !== "all") {
      rows = rows.filter((row) => row.area === areaFilter);
    }

    const months = buildMonths(rows);
    const summary = buildSummary(months, rows);

    if (format === "csv") {
      const csv = toCsv(months, rows, summary, range);
      const filename = "rapport-per-manad.csv";

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="' + filename + '"');

      return res.status(200).send("\uFEFF" + csv);
    }

    return res.status(200).json({
      ok: true,
      range,
      summary,
      months,
      rows,
      warnings,
    });
  } catch (error: any) {
    console.error("/api/admin/rapporter-analys/per-manad error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hämta rapport per månad.",
    });
  }
}
