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

function rowText(row: any) {
  return Object.values(row || {})
    .map((value) => String(value ?? ""))
    .join(" ")
    .toLowerCase();
}

function looksLikeTicket(row: any) {
  const text = rowText(row);

  return (
    text.includes("biljett") ||
    text.includes("ticket") ||
    text.includes("sundra") ||
    text.includes("shuttle") ||
    text.includes("flygbuss") ||
    text.includes("airport shuttle") ||
    text.includes("airport")
  );
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
    "Okänd biljett"
  );
}

function customerName(row: any, invoice?: any) {
  return (
    row.customer_name ||
    row.passenger_name ||
    row.name ||
    invoice?.customer_name ||
    "Okänd kund"
  );
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

function addMap(map: Map<string, number>, key: string, amount: number) {
  const safeKey = key || "Okänt";
  map.set(safeKey, n(map.get(safeKey) || 0) + n(amount));
}

function addQtyMap(map: Map<string, number>, key: string, qty: number) {
  const safeKey = key || "Okänt";
  map.set(safeKey, Number(map.get(safeKey) || 0) + Number(qty || 0));
}

function sortAmountMap(map: Map<string, number>, limit = 10) {
  return Array.from(map.entries())
    .map(([label, value]) => ({
      label,
      value: Number(n(value).toFixed(2)),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function sortQtyMap(map: Map<string, number>, limit = 10) {
  return Array.from(map.entries())
    .map(([label, value]) => ({
      label,
      value: Number(value || 0),
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

function amountFromRow(row: any) {
  return n(
    row.total_amount ||
      row.line_total_incl_vat ||
      row.line_total_excl_vat ||
      row.gross_amount ||
      row.price ||
      row.amount ||
      row.ticket_price ||
      row.unit_price ||
      0
  );
}

function quantityFromRow(row: any) {
  const qty = Number(row.quantity || row.qty || row.passengers || row.passenger_count || 1);
  return Number.isFinite(qty) && qty > 0 ? qty : 1;
}

function dateFromRow(row: any, invoice?: any) {
  return (
    row.travel_date ||
    row.departure_date ||
    row.ticket_date ||
    row.booking_date ||
    row.created_at ||
    invoice?.invoice_date ||
    invoice?.created_at
  );
}

function buildFromInvoiceLines(lines: any[], invoices: any[], range: any) {
  const invoiceById = new Map((invoices || []).map((invoice: any) => [String(invoice.id), invoice]));
  const rows: any[] = [];

  for (const line of lines || []) {
    const invoice =
      invoiceById.get(String(line.invoice_id || line.finance_invoice_id || line.customer_invoice_id || "")) ||
      null;

    const date = dateFromRow(line, invoice);

    if (!inRange(date, range.start, range.end)) continue;
    const ticketContext = { ...line, invoice };
    if (!looksLikeTicket(ticketContext)) continue;

    const area = areaName(ticketContext);
    if (area === "Beställningstrafik") continue;

    const qty = quantityFromRow(line);
    const amount = amountFromRow(line);

    rows.push({
      id: line.id,
      source: "Fakturarad",
      date: isoDate(date),
      area,
      product: productName(line),
      customer: customerName(line, invoice),
      quantity: qty,
      amount,
      average_price: qty > 0 ? Number((amount / qty).toFixed(2)) : amount,
      status: statusLabel(invoice?.status || line.status || ""),
      invoice_number: invoice?.invoice_number || "",
      href: invoice?.id ? "/admin/ekonomi/fakturor/" + invoice.id : "",
    });
  }

  return rows;
}

function buildFromTableRows(tableName: string, sourceLabel: string, rowsRaw: any[], range: any) {
  const rows: any[] = [];

  for (const row of rowsRaw || []) {
    const date = dateFromRow(row);

    if (!inRange(date, range.start, range.end)) continue;
    if (!looksLikeTicket(row) && !tableName.includes("ticket")) continue;

    const area = areaName(row);
    if (area === "Beställningstrafik") continue;

    const qty = quantityFromRow(row);
    const amount = amountFromRow(row);

    rows.push({
      id: row.id,
      source: sourceLabel,
      date: isoDate(date),
      area,
      product: productName(row),
      customer: customerName(row),
      quantity: qty,
      amount,
      average_price: qty > 0 ? Number((amount / qty).toFixed(2)) : amount,
      status: statusLabel(row.status || row.payment_status || row.booking_status || ""),
      invoice_number: row.invoice_number || "",
      href: "",
    });
  }

  return rows;
}

function buildSummary(rows: any[]) {
  const ticketCount = rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  const revenue = rows.reduce((sum, row) => sum + n(row.amount), 0);
  const averagePrice = ticketCount > 0 ? revenue / ticketCount : 0;

  const paidRows = rows.filter((row) => {
    const status = String(row.status || "").toLowerCase();
    return status.includes("betald") || status.includes("paid") || status.includes("bekräftad");
  });

  return {
    rowCount: rows.length,
    ticketCount: Number(ticketCount.toFixed(0)),
    revenue: Number(revenue.toFixed(2)),
    averagePrice: Number(averagePrice.toFixed(2)),
    paidCount: paidRows.length,
    unpaidCount: rows.length - paidRows.length,
  };
}

function buildCharts(rows: any[]) {
  const productQty = new Map<string, number>();
  const productRevenue = new Map<string, number>();
  const areaQty = new Map<string, number>();
  const areaRevenue = new Map<string, number>();
  const customerRevenue = new Map<string, number>();

  for (const row of rows) {
    addQtyMap(productQty, row.product, row.quantity);
    addMap(productRevenue, row.product, row.amount);
    addQtyMap(areaQty, row.area, row.quantity);
    addMap(areaRevenue, row.area, row.amount);
    addMap(customerRevenue, row.customer, row.amount);
  }

  return {
    productQty: sortQtyMap(productQty),
    productRevenue: sortAmountMap(productRevenue),
    areaQty: sortQtyMap(areaQty),
    areaRevenue: sortAmountMap(areaRevenue),
    customerRevenue: sortAmountMap(customerRevenue),
  };
}

function toCsv(rows: any[], summary: any, range: any) {
  const csvRows = [
    ["Sålda biljetter"],
    ["Period", range.start || "Alla", range.end || "Alla"],
    [],
    ["Sammanställning"],
    ["Antal biljetter", summary.ticketCount],
    ["Intäkt", csvMoney(summary.revenue)],
    ["Snittpris", csvMoney(summary.averagePrice)],
    [],
    ["Datum", "Källa", "Område", "Produkt/resa", "Kund", "Antal", "Belopp", "Snittpris", "Status", "Faktura", "Länk"],
    ...rows.map((row) => [
      row.date,
      row.source,
      row.area,
      row.product,
      row.customer,
      row.quantity,
      csvMoney(row.amount),
      csvMoney(row.average_price),
      row.status,
      row.invoice_number,
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

    const warnings: string[] = [];

    const invoicesResult = await safeSelect(supabase, "finance_invoices");
    const linesResult = await safeSelect(supabase, "finance_invoice_lines");

    const possibleTicketTables = [
      ["tickets", "Biljetter"],
      ["sundra_tickets", "Sundra biljetter"],
      ["shuttle_tickets", "Shuttle biljetter"],
      ["airport_shuttle_tickets", "Airport Shuttle biljetter"],
      ["sundra_bookings", "Sundra bokningar"],
      ["shuttle_bookings", "Shuttle bokningar"],
      ["bookings", "Bokningar"],
    ];

    if (invoicesResult.warning) warnings.push(invoicesResult.warning);
    if (linesResult.warning) warnings.push(linesResult.warning);

    let rows = buildFromInvoiceLines(linesResult.data, invoicesResult.data, range);

    for (const [tableName, sourceLabel] of possibleTicketTables) {
      const result = await safeSelect(supabase, tableName);

      if (!result.warning && result.data.length > 0) {
        rows = rows.concat(buildFromTableRows(tableName, sourceLabel, result.data, range));
      }
    }

    rows = rows.sort((a, b) => String(b.date).localeCompare(String(a.date)));

    const summary = buildSummary(rows);
    const charts = buildCharts(rows);

    if (format === "csv") {
      const csv = toCsv(rows, summary, range);
      const filename = "salda-biljetter.csv";

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="' + filename + '"');

      return res.status(200).send("\uFEFF" + csv);
    }

    return res.status(200).json({
      ok: true,
      range,
      summary,
      charts,
      rows,
      warnings,
    });
  } catch (error: any) {
    console.error("/api/admin/rapporter-analys/salda-biljetter error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hämta sålda biljetter.",
    });
  }
}
