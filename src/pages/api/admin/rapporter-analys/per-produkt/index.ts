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
    case "cancelled": return "Avbokad";
    case "refunded": return "Återbetald";
    default: return status || "";
  }
}

function isArchived(status: any) {
  return String(status || "").toLowerCase() === "archived";
}

function productName(row: any) {
  return (
    row.product_name ||
    row.product_title ||
    row.article_name ||
    row.item_name ||
    row.trip_title ||
    row.route_name ||
    row.line_name ||
    row.description ||
    row.title ||
    row.name ||
    "Okänd produkt"
  );
}

function productCode(row: any) {
  return (
    row.product_code ||
    row.article_code ||
    row.item_code ||
    row.sku ||
    row.code ||
    ""
  );
}

function quantity(row: any) {
  const qty = Number(row.quantity || row.qty || row.amount_quantity || 1);

  return Number.isFinite(qty) && qty > 0 ? qty : 1;
}

function incomeNet(row: any) {
  return n(
    row.line_total_excl_vat ||
      row.subtotal_excl_vat ||
      row.net_amount ||
      row.total_excl_vat ||
      row.amount_excl_vat ||
      row.line_total_incl_vat ||
      row.total_amount ||
      row.gross_amount ||
      0
  );
}

function incomeGross(row: any) {
  return n(
    row.line_total_incl_vat ||
      row.total_amount ||
      row.gross_amount ||
      row.line_total_excl_vat ||
      row.subtotal_excl_vat ||
      row.net_amount ||
      0
  );
}

function costNet(row: any) {
  return n(
    row.line_total_excl_vat ||
      row.subtotal_excl_vat ||
      row.net_amount ||
      row.total_excl_vat ||
      row.amount_excl_vat ||
      row.line_total_incl_vat ||
      row.total_amount ||
      row.gross_amount ||
      0
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

function invoiceDate(line: any, invoice: any) {
  return (
    invoice?.invoice_date ||
    line.invoice_date ||
    line.created_at ||
    invoice?.created_at
  );
}

function invoiceCustomer(line: any, invoice: any) {
  return (
    invoice?.customer_name ||
    line.customer_name ||
    line.client_name ||
    line.company_name ||
    "Okänd kund"
  );
}

function supplierName(line: any, invoice: any) {
  return (
    invoice?.supplier_name ||
    line.supplier_name ||
    line.company_name ||
    "Okänd leverantör"
  );
}

function invoiceNumber(line: any, invoice: any) {
  return (
    invoice?.invoice_number ||
    invoice?.supplier_invoice_number ||
    line.invoice_number ||
    line.supplier_invoice_number ||
    ""
  );
}

function buildRows(customerLines: any[], customerInvoices: any[], supplierLines: any[], supplierInvoices: any[], range: any) {
  const rows: any[] = [];

  const customerInvoiceById = new Map(
    (customerInvoices || []).map((invoice: any) => [String(invoice.id), invoice])
  );

  const supplierInvoiceById = new Map(
    (supplierInvoices || []).map((invoice: any) => [String(invoice.id), invoice])
  );

  for (const line of customerLines || []) {
    const invoice =
      customerInvoiceById.get(String(line.invoice_id || line.finance_invoice_id || line.customer_invoice_id || "")) ||
      null;

    const date = invoiceDate(line, invoice);

    if (!inRange(date, range.start, range.end)) continue;
    if (invoice && isArchived(invoice.status)) continue;

    const qty = quantity(line);
    const net = incomeNet(line);
    const gross = incomeGross(line);

    if (net <= 0 && gross <= 0) continue;

    rows.push({
      id: line.id,
      date: isoDate(date),
      type: "Intäkt",
      source: "Kundfakturarad",
      product: productName(line),
      code: productCode(line),
      area: areaName({ ...line, invoice }),
      name: invoiceCustomer(line, invoice),
      number: invoiceNumber(line, invoice),
      quantity: qty,
      revenue: net,
      costs: 0,
      result: net,
      gross_amount: gross,
      average_price: qty > 0 ? Number((net / qty).toFixed(2)) : net,
      status: statusLabel(invoice?.status || line.status),
      href: invoice?.id ? "/admin/ekonomi/fakturor/" + invoice.id : "",
    });
  }

  for (const line of supplierLines || []) {
    const invoice =
      supplierInvoiceById.get(String(line.invoice_id || line.supplier_invoice_id || line.finance_supplier_invoice_id || "")) ||
      null;

    const date = invoiceDate(line, invoice);

    if (!inRange(date, range.start, range.end)) continue;
    if (invoice && isArchived(invoice.status)) continue;

    const qty = quantity(line);
    const cost = costNet(line);

    if (cost <= 0) continue;

    rows.push({
      id: line.id,
      date: isoDate(date),
      type: "Kostnad",
      source: "Leverantörsrad",
      product: productName(line),
      code: productCode(line),
      area: areaName({ ...line, invoice }),
      name: supplierName(line, invoice),
      number: invoiceNumber(line, invoice),
      quantity: qty,
      revenue: 0,
      costs: cost,
      result: -Math.abs(cost),
      gross_amount: cost,
      average_price: qty > 0 ? Number((cost / qty).toFixed(2)) : cost,
      status: statusLabel(invoice?.status || line.status),
      href: invoice?.id ? "/admin/ekonomi/leverantorsreskontra/" + invoice.id : "",
    });
  }

  return rows.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function buildProducts(rows: any[]) {
  const map = new Map<string, any>();

  for (const row of rows) {
    const key = (row.code ? row.code + " · " : "") + row.product;

    const existing =
      map.get(key) ||
      {
        product_id: key,
        product: row.product,
        code: row.code,
        rows: 0,
        quantity: 0,
        revenue: 0,
        costs: 0,
        result: 0,
        gross_amount: 0,
        sundra: 0,
        shuttle: 0,
        bestallningstrafik: 0,
      };

    existing.rows += 1;
    existing.quantity += Number(row.quantity || 0);
    existing.revenue = Number((n(existing.revenue) + n(row.revenue)).toFixed(2));
    existing.costs = Number((n(existing.costs) + n(row.costs)).toFixed(2));
    existing.result = Number((n(existing.revenue) - n(existing.costs)).toFixed(2));
    existing.gross_amount = Number((n(existing.gross_amount) + n(row.gross_amount)).toFixed(2));

    if (row.area === "Sundra") existing.sundra += 1;
    if (row.area === "Shuttle") existing.shuttle += 1;
    if (row.area === "Beställningstrafik") existing.bestallningstrafik += 1;

    map.set(key, existing);
  }

  return Array.from(map.values())
    .map((product) => ({
      ...product,
      average_price:
        product.quantity > 0 ? Number((product.revenue / product.quantity).toFixed(2)) : 0,
      margin_percent:
        product.revenue > 0 ? Number(((product.result / product.revenue) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

function buildAreaChart(rows: any[]) {
  const map = new Map<string, any>();

  for (const row of rows) {
    const key = row.area || "Okänt";
    const existing =
      map.get(key) ||
      {
        label: key,
        rows: 0,
        quantity: 0,
        revenue: 0,
        costs: 0,
        result: 0,
      };

    existing.rows += 1;
    existing.quantity += Number(row.quantity || 0);
    existing.revenue = Number((n(existing.revenue) + n(row.revenue)).toFixed(2));
    existing.costs = Number((n(existing.costs) + n(row.costs)).toFixed(2));
    existing.result = Number((n(existing.revenue) - n(existing.costs)).toFixed(2));

    map.set(key, existing);
  }

  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}

function buildSummary(rows: any[], products: any[]) {
  const quantityTotal = rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  const revenue = rows.reduce((sum, row) => sum + n(row.revenue), 0);
  const costs = rows.reduce((sum, row) => sum + n(row.costs), 0);
  const result = revenue - costs;
  const gross = rows.reduce((sum, row) => sum + n(row.gross_amount), 0);

  return {
    productCount: products.length,
    rowCount: rows.length,
    quantityTotal: Number(quantityTotal.toFixed(0)),
    revenue: Number(revenue.toFixed(2)),
    costs: Number(costs.toFixed(2)),
    result: Number(result.toFixed(2)),
    gross: Number(gross.toFixed(2)),
    averagePrice:
      quantityTotal > 0 ? Number((revenue / quantityTotal).toFixed(2)) : 0,
    marginPercent:
      revenue > 0 ? Number(((result / revenue) * 100).toFixed(1)) : 0,
  };
}

function toCsv(rows: any[], products: any[], summary: any, areaChart: any[], range: any) {
  const csvRows = [
    ["Rapport per produkt"],
    ["Period", range.start || "Alla", range.end || "Alla"],
    [],
    ["Sammanställning"],
    ["Antal produkter", summary.productCount],
    ["Antal rader", summary.rowCount],
    ["Antal/st", summary.quantityTotal],
    ["Intäkter", csvMoney(summary.revenue)],
    ["Kostnader", csvMoney(summary.costs)],
    ["Resultat", csvMoney(summary.result)],
    ["Snittpris", csvMoney(summary.averagePrice)],
    ["Marginal %", String(summary.marginPercent).replace(".", ",")],
    [],
    ["Per område"],
    ["Område", "Rader", "Antal", "Intäkter", "Kostnader", "Resultat"],
    ...areaChart.map((row) => [
      row.label,
      row.rows,
      row.quantity,
      csvMoney(row.revenue),
      csvMoney(row.costs),
      csvMoney(row.result),
    ]),
    [],
    ["Produkter"],
    ["Produkt", "Kod", "Rader", "Antal", "Intäkter", "Kostnader", "Resultat", "Snittpris", "Marginal %", "Sundra", "Shuttle", "Beställningstrafik"],
    ...products.map((product) => [
      product.product,
      product.code,
      product.rows,
      product.quantity,
      csvMoney(product.revenue),
      csvMoney(product.costs),
      csvMoney(product.result),
      csvMoney(product.average_price),
      String(product.margin_percent).replace(".", ","),
      product.sundra,
      product.shuttle,
      product.bestallningstrafik,
    ]),
    [],
    ["Underlag"],
    ["Datum", "Typ", "Källa", "Produkt", "Kod", "Område", "Namn", "Nummer", "Antal", "Intäkt", "Kostnad", "Resultat", "Snittpris", "Status", "Länk"],
    ...rows.map((row) => [
      row.date,
      row.type,
      row.source,
      row.product,
      row.code,
      row.area,
      row.name,
      row.number,
      row.quantity,
      csvMoney(row.revenue),
      csvMoney(row.costs),
      csvMoney(row.result),
      csvMoney(row.average_price),
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
    const productFilter = String(req.query.product || "all");

    const warnings: string[] = [];

    const customerLinesResult = await safeSelect(supabase, "finance_invoice_lines");
    const customerInvoicesResult = await safeSelect(supabase, "finance_invoices");
    const supplierLinesResult = await safeSelect(supabase, "supplier_invoice_lines");
    const supplierInvoicesResult = await safeSelect(supabase, "supplier_invoices");

    for (const result of [
      customerLinesResult,
      customerInvoicesResult,
      supplierLinesResult,
      supplierInvoicesResult,
    ]) {
      if (result.warning) warnings.push(result.warning);
    }

    let rows = buildRows(
      customerLinesResult.data,
      customerInvoicesResult.data,
      supplierLinesResult.data,
      supplierInvoicesResult.data,
      range
    );

    if (areaFilter !== "all") {
      rows = rows.filter((row) => row.area === areaFilter);
    }

    if (productFilter !== "all") {
      rows = rows.filter((row) => ((row.code ? row.code + " · " : "") + row.product) === productFilter);
    }

    const products = buildProducts(rows);
    const areaChart = buildAreaChart(rows);
    const summary = buildSummary(rows, products);

    if (format === "csv") {
      const csv = toCsv(rows, products, summary, areaChart, range);
      const filename = "rapport-per-produkt.csv";

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="' + filename + '"');

      return res.status(200).send("\uFEFF" + csv);
    }

    return res.status(200).json({
      ok: true,
      range,
      summary,
      products,
      areaChart,
      rows,
      warnings,
    });
  } catch (error: any) {
    console.error("/api/admin/rapporter-analys/per-produkt error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hämta rapport per produkt.",
    });
  }
}
