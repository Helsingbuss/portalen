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

function currentYear() {
  return new Date().getFullYear();
}

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function monthKey(value: any) {
  const date = isoDate(value);
  return date ? date.slice(0, 7) : "";
}

function isPaid(status: any) {
  return String(status || "").toLowerCase() === "paid";
}

function isArchived(status: any) {
  return String(status || "").toLowerCase() === "archived";
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

function addToMap(map: Map<string, number>, key: string, value: number) {
  const safeKey = key || "Okänt";
  map.set(safeKey, n(map.get(safeKey) || 0) + n(value));
}

function sortMap(map: Map<string, number>, limit = 8) {
  return Array.from(map.entries())
    .map(([label, value]) => ({
      label,
      value: Number(n(value).toFixed(2)),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function emptyMonthRows(year: number) {
  const rows: any[] = [];

  for (let i = 1; i <= 12; i++) {
    const key = year + "-" + String(i).padStart(2, "0");

    rows.push({
      month: key,
      revenue: 0,
      costs: 0,
      result: 0,
    });
  }

  return rows;
}

async function safeSelect(supabase: any, table: string, select = "*") {
  const { data, error } = await supabase.from(table).select(select).limit(5000);

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    const year = Number.parseInt(String(req.query.year || currentYear()), 10) || currentYear();
    const yearStart = year + "-01-01";
    const yearEnd = year + "-12-31";
    const month = currentMonthKey();

    const warnings: string[] = [];

    const customerResult = await safeSelect(supabase, "finance_invoices");
    const supplierResult = await safeSelect(supabase, "supplier_invoices");
    const transactionResult = await safeSelect(supabase, "finance_transactions");
    const invoiceLinesResult = await safeSelect(supabase, "finance_invoice_lines");

    for (const result of [customerResult, supplierResult, transactionResult, invoiceLinesResult]) {
      if (result.warning) warnings.push(result.warning);
    }

    const customerInvoices = customerResult.data.filter((row: any) => {
      const date = isoDate(row.invoice_date || row.created_at);
      return date >= yearStart && date <= yearEnd && !isArchived(row.status);
    });

    const supplierInvoices = supplierResult.data.filter((row: any) => {
      const date = isoDate(row.invoice_date || row.created_at);
      return date >= yearStart && date <= yearEnd && !isArchived(row.status);
    });

    const transactions = transactionResult.data.filter((row: any) => {
      const date = isoDate(row.transaction_date || row.created_at);
      return date >= yearStart && date <= yearEnd;
    });

    const monthRows = emptyMonthRows(year);
    const monthMap = new Map(monthRows.map((row) => [row.month, row]));

    const customerMap = new Map<string, number>();
    const areaMap = new Map<string, number>();
    const productMap = new Map<string, number>();

    let revenueYear = 0;
    let revenueMonth = 0;
    let customerInvoiceCount = 0;
    let customerPaidAmount = 0;
    let customerUnpaidAmount = 0;
    let overdueCount = 0;

    for (const invoice of customerInvoices) {
      const key = monthKey(invoice.invoice_date || invoice.created_at);
      const row = monthMap.get(key);
      const revenue = n(invoice.subtotal_excl_vat);
      const total = n(invoice.total_amount);
      const unpaid = isPaid(invoice.status) ? 0 : n(invoice.unpaid_amount || invoice.total_amount);

      customerInvoiceCount += 1;
      revenueYear += revenue;

      if (key === month) {
        revenueMonth += revenue;
      }

      if (row) {
        row.revenue = Number((n(row.revenue) + revenue).toFixed(2));
      }

      if (isPaid(invoice.status)) {
        customerPaidAmount += total;
      } else {
        customerUnpaidAmount += unpaid;
        overdueCount += String(invoice.status || "").toLowerCase() === "overdue" ? 1 : 0;
      }

      addToMap(customerMap, invoice.customer_name || "Okänd kund", revenue);
      addToMap(areaMap, areaName(invoice), revenue);
    }

    let costsYear = 0;
    let costsMonth = 0;
    let supplierInvoiceCount = 0;
    let supplierUnpaidAmount = 0;

    for (const invoice of supplierInvoices) {
      const key = monthKey(invoice.invoice_date || invoice.created_at);
      const row = monthMap.get(key);
      const cost = n(invoice.subtotal_excl_vat);
      const unpaid = isPaid(invoice.status) ? 0 : n(invoice.unpaid_amount || invoice.total_amount);

      supplierInvoiceCount += 1;
      costsYear += cost;

      if (key === month) {
        costsMonth += cost;
      }

      if (row) {
        row.costs = Number((n(row.costs) + cost).toFixed(2));
      }

      if (!isPaid(invoice.status)) {
        supplierUnpaidAmount += unpaid;
      }
    }

    for (const tx of transactions) {
      if (tx.invoice_id || tx.supplier_invoice_id) continue;

      const key = monthKey(tx.transaction_date || tx.created_at);
      const row = monthMap.get(key);

      const isExpense = String(tx.transaction_type || "") === "expense";
      const amount = Math.abs(n(tx.net_amount));

      if (isExpense) {
        costsYear += amount;
        if (key === month) costsMonth += amount;
        if (row) row.costs = Number((n(row.costs) + amount).toFixed(2));
      } else {
        revenueYear += amount;
        if (key === month) revenueMonth += amount;
        if (row) row.revenue = Number((n(row.revenue) + amount).toFixed(2));
        addToMap(areaMap, areaName(tx), amount);
      }
    }

    let soldTicketQuantity = 0;

    for (const line of invoiceLinesResult.data || []) {
      if (looksLikeTicket(line) && areaName(line) !== "Beställningstrafik") {
        const qty = Number(line.quantity || 1);
        soldTicketQuantity += Number.isFinite(qty) ? qty : 1;
      }

      const productName = line.description || line.title || line.product_name || "Okänd produkt";
      const lineTotal = n(line.line_total_incl_vat || line.total_amount || line.line_total_excl_vat);

      if (lineTotal > 0) {
        addToMap(productMap, productName, lineTotal);
      }
    }

    for (const row of monthRows) {
      row.result = Number((n(row.revenue) - n(row.costs)).toFixed(2));
    }

    const resultYear = revenueYear - costsYear;
    const resultMonth = revenueMonth - costsMonth;

    const marginPercent =
      revenueYear > 0 ? Number(((resultYear / revenueYear) * 100).toFixed(1)) : 0;

    return res.status(200).json({
      ok: true,
      year,
      warnings,
      summary: {
        revenueYear: Number(revenueYear.toFixed(2)),
        costsYear: Number(costsYear.toFixed(2)),
        resultYear: Number(resultYear.toFixed(2)),
        marginPercent,

        revenueMonth: Number(revenueMonth.toFixed(2)),
        costsMonth: Number(costsMonth.toFixed(2)),
        resultMonth: Number(resultMonth.toFixed(2)),

        customerInvoiceCount,
        supplierInvoiceCount,

        customerPaidAmount: Number(customerPaidAmount.toFixed(2)),
        customerUnpaidAmount: Number(customerUnpaidAmount.toFixed(2)),
        supplierUnpaidAmount: Number(supplierUnpaidAmount.toFixed(2)),
        overdueCount,

        soldTicketQuantity,
      },
      charts: {
        months: monthRows,
        topCustomers: sortMap(customerMap, 8),
        topAreas: sortMap(areaMap, 5),
        topProducts: sortMap(productMap, 8),
      },
      links: [
        ["/admin/rapporter-analys/salda-biljetter", "Sålda biljetter"],
        ["/admin/rapporter-analys/intaktsrapport", "Intäktsrapport"],
        ["/admin/rapporter-analys/agentrapport", "Agentrapport"],
        ["/admin/rapporter-analys/forarrapport", "Förarrapport"],
        ["/admin/rapporter-analys/operatorrapport", "Operatörsrapport"],
        ["/admin/rapporter-analys/belaggning-kapacitet", "Beläggning & kapacitet"],
        ["/admin/rapporter-analys/kundanalys", "Kundanalys"],
        ["/admin/rapporter-analys/per-vecka", "Per vecka"],
        ["/admin/rapporter-analys/per-manad", "Per månad"],
        ["/admin/rapporter-analys/per-produkt", "Per produkt"],
      ],
    });
  } catch (error: any) {
    console.error("/api/admin/rapporter-analys/oversikt error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hämta rapportöversikt.",
    });
  }
}
