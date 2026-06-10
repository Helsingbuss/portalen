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
  const period = String(query.period || "month");
  const now = new Date();

  if (period === "all") {
    return {
      period,
      from: null,
      to: null,
      label: "Alla datum",
    };
  }

  if (period === "year") {
    const from = new Date(now.getFullYear(), 0, 1);

    return {
      period,
      from: dateOnly(from),
      to: dateOnly(now),
      label: "I år",
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

  const from = new Date(now.getFullYear(), now.getMonth(), 1);

  return {
    period: "month",
    from: dateOnly(from),
    to: dateOnly(now),
    label: "Denna månad",
  };
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

function vatKey(value: any) {
  const rate = n(value);

  if (Math.abs(rate - 0) < 0.001) return "0";
  if (Math.abs(rate - 6) < 0.001) return "6";
  if (Math.abs(rate - 12) < 0.001) return "12";
  if (Math.abs(rate - 25) < 0.001) return "25";

  return "other-" + String(rate).replace(".", "_");
}

function vatLabel(key: string) {
  if (key === "0") return "0 %";
  if (key === "6") return "6 %";
  if (key === "12") return "12 %";
  if (key === "25") return "25 %";
  return "Övrig";
}

function emptyGroup(key: string) {
  return {
    key,
    label: vatLabel(key),
    outgoingNet: 0,
    outgoingVat: 0,
    incomingNet: 0,
    incomingVat: 0,
    vatToPay: 0,
  };
}

function addGroup(groups: Record<string, any>, key: string, type: "outgoing" | "incoming", net: number, vat: number) {
  if (!groups[key]) groups[key] = emptyGroup(key);

  if (type === "outgoing") {
    groups[key].outgoingNet += net;
    groups[key].outgoingVat += vat;
  } else {
    groups[key].incomingNet += net;
    groups[key].incomingVat += vat;
  }

  groups[key].vatToPay = groups[key].outgoingVat - groups[key].incomingVat;
}

function finalizeGroups(groups: Record<string, any>) {
  const order = ["0", "6", "12", "25"];
  const values = Object.values(groups);

  return values
    .sort((a: any, b: any) => {
      const ai = order.indexOf(a.key);
      const bi = order.indexOf(b.key);

      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;

      return String(a.label).localeCompare(String(b.label));
    })
    .map((row: any) => ({
      ...row,
      outgoingNet: round(row.outgoingNet),
      outgoingVat: round(row.outgoingVat),
      incomingNet: round(row.incomingNet),
      incomingVat: round(row.incomingVat),
      vatToPay: round(row.vatToPay),
    }));
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
    const groups: Record<string, any> = {};

    const { data: customerInvoicesRaw, error: customerError } = await supabase
      .from("finance_invoices")
      .select("id, invoice_number, customer_name, status, invoice_date, created_at, subtotal_excl_vat, vat_amount, total_amount")
      .limit(2000);

    if (customerError) throw customerError;

    const customerInvoices = (customerInvoicesRaw || [])
      .filter((row) => !isArchived(row.status))
      .filter((row) => isBetween(row.invoice_date || row.created_at, period.from, period.to));

    const customerIds = new Set(customerInvoices.map((row) => row.id));

    const { data: customerLinesRaw, error: customerLinesError } = await supabase
      .from("finance_invoice_lines")
      .select("invoice_id, vat_percent, line_total_excl_vat, vat_amount")
      .limit(5000);

    if (customerLinesError) throw customerLinesError;

    for (const line of customerLinesRaw || []) {
      if (!customerIds.has(line.invoice_id)) continue;

      addGroup(
        groups,
        vatKey(line.vat_percent),
        "outgoing",
        n(line.line_total_excl_vat),
        n(line.vat_amount)
      );
    }

    let supplierNeedsSetup = false;
    let supplierInvoicesRaw: any[] = [];
    let supplierLinesRaw: any[] = [];

    const { data: supplierData, error: supplierError } = await supabase
      .from("supplier_invoices")
      .select("id, supplier_name, supplier_invoice_number, status, invoice_date, created_at, subtotal_excl_vat, vat_amount, total_amount")
      .limit(2000);

    if (supplierError) {
      if (isMissingTableError(supplierError)) {
        supplierNeedsSetup = true;
      } else {
        throw supplierError;
      }
    } else {
      supplierInvoicesRaw = supplierData || [];
    }

    if (!supplierNeedsSetup) {
      const { data: supplierLinesData, error: supplierLinesError } = await supabase
        .from("supplier_invoice_lines")
        .select("supplier_invoice_id, vat_percent, line_total_excl_vat, vat_amount")
        .limit(5000);

      if (supplierLinesError) {
        if (isMissingTableError(supplierLinesError)) {
          supplierNeedsSetup = true;
        } else {
          throw supplierLinesError;
        }
      } else {
        supplierLinesRaw = supplierLinesData || [];
      }
    }

    const supplierInvoices = supplierInvoicesRaw
      .filter((row) => !isArchived(row.status))
      .filter((row) => isBetween(row.invoice_date || row.created_at, period.from, period.to));

    const supplierIds = new Set(supplierInvoices.map((row) => row.id));

    for (const line of supplierLinesRaw || []) {
      if (!supplierIds.has(line.supplier_invoice_id)) continue;

      addGroup(
        groups,
        vatKey(line.vat_percent),
        "incoming",
        n(line.line_total_excl_vat),
        n(line.vat_amount)
      );
    }

    let transactionsNeedsSetup = false;
    let transactionsRaw: any[] = [];

    const { data: transactionData, error: transactionError } = await supabase
      .from("finance_transactions")
      .select("*")
      .limit(3000);

    if (transactionError) {
      if (isMissingTableError(transactionError)) {
        transactionsNeedsSetup = true;
      } else {
        throw transactionError;
      }
    } else {
      transactionsRaw = transactionData || [];
    }

    const otherTransactions = transactionsRaw
      .filter((row) => isBetween(row.transaction_date || row.created_at, period.from, period.to))
      .filter((row) => !row.invoice_id && !row.supplier_invoice_id);

    for (const transaction of otherTransactions) {
      const type = String(transaction.transaction_type || "");

      if (type === "income") {
        addGroup(
          groups,
          vatKey(transaction.vat_percent),
          "outgoing",
          n(transaction.net_amount || transaction.gross_amount),
          n(transaction.vat_amount)
        );
      }

      if (type === "expense") {
        addGroup(
          groups,
          vatKey(transaction.vat_percent),
          "incoming",
          n(transaction.net_amount || transaction.gross_amount),
          n(transaction.vat_amount)
        );
      }
    }

    const rows = finalizeGroups(groups);

    const outgoingVat = rows.reduce((sum: number, row: any) => sum + n(row.outgoingVat), 0);
    const incomingVat = rows.reduce((sum: number, row: any) => sum + n(row.incomingVat), 0);
    const vatToPay = outgoingVat - incomingVat;

    const outgoingNet = rows.reduce((sum: number, row: any) => sum + n(row.outgoingNet), 0);
    const incomingNet = rows.reduce((sum: number, row: any) => sum + n(row.incomingNet), 0);

    return res.status(200).json({
      ok: true,
      period,
      supplierNeedsSetup,
      transactionsNeedsSetup,
      rows,
      summary: {
        outgoingNet: round(outgoingNet),
        outgoingVat: round(outgoingVat),
        incomingNet: round(incomingNet),
        incomingVat: round(incomingVat),
        vatToPay: round(vatToPay),
        customerInvoiceCount: customerInvoices.length,
        supplierInvoiceCount: supplierInvoices.length,
        otherTransactionCount: otherTransactions.length,
      },
      sourceSummary: {
        customerInvoices: {
          count: customerInvoices.length,
          net: round(customerInvoices.reduce((sum, row) => sum + n(row.subtotal_excl_vat), 0)),
          vat: round(customerInvoices.reduce((sum, row) => sum + n(row.vat_amount), 0)),
        },
        supplierInvoices: {
          count: supplierInvoices.length,
          net: round(supplierInvoices.reduce((sum, row) => sum + n(row.subtotal_excl_vat), 0)),
          vat: round(supplierInvoices.reduce((sum, row) => sum + n(row.vat_amount), 0)),
        },
        otherTransactions: {
          count: otherTransactions.length,
        },
      },
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/momsrapport error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hämta momsrapport.",
    });
  }
}
