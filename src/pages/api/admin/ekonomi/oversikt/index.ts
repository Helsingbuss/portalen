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
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
}

function round(value: number) {
  return Number(value.toFixed(2));
}

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDate(value: any) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function isBetween(value: any, from?: string | null, to?: string | null) {
  if (!from && !to) return true;

  const date = parseDate(value);
  if (!date) return false;

  if (from && date < new Date(from + "T00:00:00")) return false;
  if (to && date > new Date(to + "T23:59:59")) return false;

  return true;
}

function resolvePeriod(query: any) {
  const period = String(query.period || "year");
  const now = new Date();

  if (period === "all") {
    return {
      period,
      from: null,
      to: null,
      label: "Alla datum",
    };
  }

  if (period === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      period,
      from: dateOnly(from),
      to: dateOnly(now),
      label: "Denna månad",
    };
  }

  if (period === "last30") {
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    return {
      period,
      from: dateOnly(from),
      to: dateOnly(now),
      label: "Senaste 30 dagarna",
    };
  }

  if (period === "last90") {
    const from = new Date(now);
    from.setDate(from.getDate() - 90);
    return {
      period,
      from: dateOnly(from),
      to: dateOnly(now),
      label: "Senaste 90 dagarna",
    };
  }

  if (period === "custom") {
    return {
      period,
      from: String(query.from || "") || null,
      to: String(query.to || "") || null,
      label: "Eget intervall",
    };
  }

  const from = new Date(now.getFullYear(), 0, 1);

  return {
    period: "year",
    from: dateOnly(from),
    to: dateOnly(now),
    label: "I år",
  };
}

function isPaid(status: any) {
  return String(status || "").toLowerCase() === "paid";
}

function isArchived(status: any) {
  return String(status || "").toLowerCase() === "archived";
}

function isMissingTableError(error: any) {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();

  return (
    code === "42p01" ||
    code === "pgrst205" ||
    message.includes("does not exist") ||
    message.includes("could not find") ||
    message.includes("schema cache")
  );
}

function monthKey(value: any) {
  const date = parseDate(value);
  if (!date) return null;

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");

  return y + "-" + m;
}

function createMonthRows() {
  const rows: any[] = [];
  const now = new Date();

  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(date);

    rows.push({
      key,
      label: date.toLocaleDateString("sv-SE", {
        year: "numeric",
        month: "short",
      }),
      revenueExVat: 0,
      costExVat: 0,
      resultExVat: 0,
    });
  }

  return rows;
}

function addToMonth(monthRows: any[], dateValue: any, key: "revenueExVat" | "costExVat", amount: number) {
  const keyValue = monthKey(dateValue);
  const row = monthRows.find((item) => item.key === keyValue);

  if (!row) return;

  row[key] += amount;
  row.resultExVat = row.revenueExVat - row.costExVat;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
      });
    }

    const period = resolvePeriod(req.query);
    const today = dateOnly(new Date());

    const { data: customerInvoicesRaw, error: customerError } = await supabase
      .from("finance_invoices")
      .select("*")
      .order("invoice_date", { ascending: false })
      .limit(1000);

    if (customerError) throw customerError;

    let supplierInvoicesRaw: any[] = [];
    let supplierNeedsSetup = false;

    const { data: supplierData, error: supplierError } = await supabase
      .from("supplier_invoices")
      .select("*")
      .order("invoice_date", { ascending: false })
      .limit(1000);

    if (supplierError) {
      if (isMissingTableError(supplierError)) {
        supplierNeedsSetup = true;
      } else {
        throw supplierError;
      }
    } else {
      supplierInvoicesRaw = supplierData || [];
    }

    let transactionsRaw: any[] = [];
    let transactionsNeedsSetup = false;

    const { data: transactionData, error: transactionError } = await supabase
      .from("finance_transactions")
      .select("*")
      .order("transaction_date", { ascending: false })
      .limit(1500);

    if (transactionError) {
      if (isMissingTableError(transactionError)) {
        transactionsNeedsSetup = true;
      } else {
        throw transactionError;
      }
    } else {
      transactionsRaw = transactionData || [];
    }

    const customerInvoices = (customerInvoicesRaw || [])
      .filter((row) => !isArchived(row.status))
      .filter((row) => isBetween(row.invoice_date || row.created_at, period.from, period.to));

    const supplierInvoices = (supplierInvoicesRaw || [])
      .filter((row) => !isArchived(row.status))
      .filter((row) => isBetween(row.invoice_date || row.created_at, period.from, period.to));

    const otherTransactions = (transactionsRaw || [])
      .filter((row) => isBetween(row.transaction_date || row.created_at, period.from, period.to))
      .filter((row) => !row.invoice_id && !row.supplier_invoice_id);

    const customerRevenueExVat = customerInvoices.reduce((sum, row) => sum + n(row.subtotal_excl_vat), 0);
    const customerVat = customerInvoices.reduce((sum, row) => sum + n(row.vat_amount), 0);
    const customerTotal = customerInvoices.reduce((sum, row) => sum + n(row.total_amount), 0);
    const customerUnpaid = customerInvoices
      .filter((row) => !isPaid(row.status))
      .reduce((sum, row) => sum + n(row.unpaid_amount || row.total_amount), 0);
    const customerPaid = customerInvoices
      .filter((row) => isPaid(row.status))
      .reduce((sum, row) => sum + n(row.paid_amount || row.total_amount), 0);

    const supplierCostExVat = supplierInvoices.reduce((sum, row) => sum + n(row.subtotal_excl_vat), 0);
    const supplierVat = supplierInvoices.reduce((sum, row) => sum + n(row.vat_amount), 0);
    const supplierTotal = supplierInvoices.reduce((sum, row) => sum + n(row.total_amount), 0);
    const supplierUnpaid = supplierInvoices
      .filter((row) => !isPaid(row.status))
      .reduce((sum, row) => sum + n(row.unpaid_amount || row.total_amount), 0);
    const supplierPaid = supplierInvoices
      .filter((row) => isPaid(row.status))
      .reduce((sum, row) => sum + n(row.paid_amount || row.total_amount), 0);

    const otherIncomeExVat = otherTransactions
      .filter((row) => String(row.transaction_type) === "income")
      .reduce((sum, row) => sum + n(row.net_amount || row.gross_amount), 0);

    const otherIncomeVat = otherTransactions
      .filter((row) => String(row.transaction_type) === "income")
      .reduce((sum, row) => sum + n(row.vat_amount), 0);

    const otherExpenseExVat = otherTransactions
      .filter((row) => String(row.transaction_type) === "expense")
      .reduce((sum, row) => sum + n(row.net_amount || row.gross_amount), 0);

    const otherExpenseVat = otherTransactions
      .filter((row) => String(row.transaction_type) === "expense")
      .reduce((sum, row) => sum + n(row.vat_amount), 0);

    const revenueExVat = customerRevenueExVat + otherIncomeExVat;
    const costExVat = supplierCostExVat + otherExpenseExVat;
    const resultExVat = revenueExVat - costExVat;

    const outgoingVat = customerVat + otherIncomeVat;
    const incomingVat = supplierVat + otherExpenseVat;
    const vatToPay = outgoingVat - incomingVat;

    const marginPercent = revenueExVat > 0 ? (resultExVat / revenueExVat) * 100 : 0;

    const overdueCustomerInvoices = customerInvoices
      .filter((row) => !isPaid(row.status))
      .filter((row) => row.due_date && row.due_date < today)
      .sort((a, b) => String(a.due_date || "").localeCompare(String(b.due_date || "")))
      .slice(0, 8);

    const overdueSupplierInvoices = supplierInvoices
      .filter((row) => !isPaid(row.status))
      .filter((row) => row.due_date && row.due_date < today)
      .sort((a, b) => String(a.due_date || "").localeCompare(String(b.due_date || "")))
      .slice(0, 8);

    const upcomingSupplierInvoices = supplierInvoices
      .filter((row) => !isPaid(row.status))
      .sort((a, b) => String(a.due_date || "").localeCompare(String(b.due_date || "")))
      .slice(0, 8);

    const monthRows = createMonthRows();

    for (const row of customerInvoicesRaw || []) {
      if (!isArchived(row.status)) {
        addToMonth(monthRows, row.invoice_date || row.created_at, "revenueExVat", n(row.subtotal_excl_vat));
      }
    }

    for (const row of supplierInvoicesRaw || []) {
      if (!isArchived(row.status)) {
        addToMonth(monthRows, row.invoice_date || row.created_at, "costExVat", n(row.subtotal_excl_vat));
      }
    }

    for (const row of transactionsRaw || []) {
      if (row.invoice_id || row.supplier_invoice_id) continue;

      if (String(row.transaction_type) === "income") {
        addToMonth(monthRows, row.transaction_date || row.created_at, "revenueExVat", n(row.net_amount || row.gross_amount));
      }

      if (String(row.transaction_type) === "expense") {
        addToMonth(monthRows, row.transaction_date || row.created_at, "costExVat", n(row.net_amount || row.gross_amount));
      }
    }

    const recentItems = [
      ...customerInvoices.slice(0, 5).map((row) => ({
        type: "customer_invoice",
        title: "Kundfaktura " + (row.invoice_number || ""),
        name: row.customer_name,
        amount: n(row.total_amount),
        date: row.invoice_date || row.created_at,
        status: row.status,
        href: "/admin/ekonomi/fakturor/" + row.id,
      })),
      ...supplierInvoices.slice(0, 5).map((row) => ({
        type: "supplier_invoice",
        title: "Leverantörsfaktura " + (row.supplier_invoice_number || ""),
        name: row.supplier_name,
        amount: n(row.total_amount),
        date: row.invoice_date || row.created_at,
        status: row.status,
        href: "/admin/ekonomi/leverantorsreskontra/" + row.id,
      })),
    ]
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
      .slice(0, 10);

    return res.status(200).json({
      ok: true,
      period,
      supplierNeedsSetup,
      transactionsNeedsSetup,
      summary: {
        revenueExVat: round(revenueExVat),
        costExVat: round(costExVat),
        resultExVat: round(resultExVat),
        marginPercent: round(marginPercent),

        customerRevenueExVat: round(customerRevenueExVat),
        customerVat: round(customerVat),
        customerTotal: round(customerTotal),
        customerUnpaid: round(customerUnpaid),
        customerPaid: round(customerPaid),
        customerCount: customerInvoices.length,

        supplierCostExVat: round(supplierCostExVat),
        supplierVat: round(supplierVat),
        supplierTotal: round(supplierTotal),
        supplierUnpaid: round(supplierUnpaid),
        supplierPaid: round(supplierPaid),
        supplierCount: supplierInvoices.length,

        otherIncomeExVat: round(otherIncomeExVat),
        otherExpenseExVat: round(otherExpenseExVat),

        outgoingVat: round(outgoingVat),
        incomingVat: round(incomingVat),
        vatToPay: round(vatToPay),

        netFutureCash: round(customerUnpaid - supplierUnpaid),
        overdueCustomerCount: overdueCustomerInvoices.length,
        overdueSupplierCount: overdueSupplierInvoices.length,
      },
      overdueCustomerInvoices,
      overdueSupplierInvoices,
      upcomingSupplierInvoices,
      monthRows: monthRows.map((row) => ({
        ...row,
        revenueExVat: round(row.revenueExVat),
        costExVat: round(row.costExVat),
        resultExVat: round(row.resultExVat),
      })),
      recentItems,
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/oversikt error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hämta ekonomisk översikt.",
    });
  }
}
