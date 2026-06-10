import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { loadCompanyBankAccounts } from "@/lib/companyFinance";

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

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function isArchived(status: any) {
  return String(status || "").toLowerCase() === "archived";
}

function isPaid(status: any) {
  return String(status || "").toLowerCase() === "paid";
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

function amountDue(row: any) {
  return n(row.unpaid_amount || row.total_amount);
}

function dueBucket(dueDate?: string | null) {
  const today = todayDate();
  const next7 = addDays(7);
  const next30 = addDays(30);

  if (!dueDate) return "no_due_date";
  if (dueDate < today) return "overdue";
  if (dueDate === today) return "today";
  if (dueDate <= next7) return "next7";
  if (dueDate <= next30) return "next30";

  return "later";
}

function summarizeDue(rows: any[]) {
  const buckets = {
    overdue: { count: 0, amount: 0 },
    today: { count: 0, amount: 0 },
    next7: { count: 0, amount: 0 },
    next30: { count: 0, amount: 0 },
    later: { count: 0, amount: 0 },
    no_due_date: { count: 0, amount: 0 },
  };

  for (const row of rows) {
    const bucket = dueBucket(row.due_date) as keyof typeof buckets;
    buckets[bucket].count += 1;
    buckets[bucket].amount += amountDue(row);
  }

  return Object.fromEntries(
    Object.entries(buckets).map(([key, value]) => [
      key,
      {
        count: value.count,
        amount: round(value.amount),
      },
    ])
  );
}

function statusText(status: any) {
  const value = String(status || "");

  switch (value) {
    case "draft": return "Utkast";
    case "sent": return "Skickad";
    case "unpaid": return "Obetald";
    case "overdue": return "Förfallen";
    case "paid": return "Betald";
    case "received": return "Mottagen";
    case "approved": return "Godkänd";
    default: return value || "Status";
  }
}

function invoiceRow(row: any) {
  return {
    id: row.id,
    type: "customer_invoice",
    invoice_number: row.invoice_number,
    ocr_number: row.ocr_number,
    name: row.customer_name,
    date: row.invoice_date,
    due_date: row.due_date,
    status: row.status,
    status_label: statusText(row.status),
    amount: round(amountDue(row)),
    total_amount: round(n(row.total_amount)),
    href: "/admin/ekonomi/fakturor/" + row.id,
  };
}

function supplierRow(row: any) {
  return {
    id: row.id,
    type: "supplier_invoice",
    invoice_number: row.supplier_invoice_number,
    ocr_number: row.ocr_number,
    name: row.supplier_name,
    date: row.invoice_date,
    due_date: row.due_date,
    status: row.status,
    status_label: statusText(row.status),
    amount: round(amountDue(row)),
    total_amount: round(n(row.total_amount)),
    href: "/admin/ekonomi/leverantorsreskontra/" + row.id,
  };
}

function mask(value?: string | null) {
  const text = String(value || "").trim();

  if (!text) return "";

  if (text.length <= 4) return text;

  return "•••• " + text.slice(-4);
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

    const today = todayDate();

    const { data: customerInvoicesRaw, error: customerError } = await supabase
      .from("finance_invoices")
      .select("*")
      .order("due_date", { ascending: true })
      .limit(1000);

    if (customerError) throw customerError;

    const customerOpen = (customerInvoicesRaw || [])
      .filter((row) => !isArchived(row.status))
      .filter((row) => !isPaid(row.status))
      .filter((row) => amountDue(row) > 0);

    let supplierNeedsSetup = false;
    let supplierOpen: any[] = [];

    const { data: supplierInvoicesRaw, error: supplierError } = await supabase
      .from("supplier_invoices")
      .select("*")
      .order("due_date", { ascending: true })
      .limit(1000);

    if (supplierError) {
      if (isMissingTableError(supplierError)) {
        supplierNeedsSetup = true;
      } else {
        throw supplierError;
      }
    } else {
      supplierOpen = (supplierInvoicesRaw || [])
        .filter((row) => !isArchived(row.status))
        .filter((row) => !isPaid(row.status))
        .filter((row) => amountDue(row) > 0);
    }

    const accounts = await loadCompanyBankAccounts(supabase);

    const customerTotal = customerOpen.reduce((sum, row) => sum + amountDue(row), 0);
    const supplierTotal = supplierOpen.reduce((sum, row) => sum + amountDue(row), 0);

    const customerOverdue = customerOpen.filter((row) => row.due_date && row.due_date < today);
    const supplierOverdue = supplierOpen.filter((row) => row.due_date && row.due_date < today);

    const customerNext7 = customerOpen.filter((row) => {
      const bucket = dueBucket(row.due_date);
      return bucket === "today" || bucket === "next7";
    });

    const supplierNext7 = supplierOpen.filter((row) => {
      const bucket = dueBucket(row.due_date);
      return bucket === "today" || bucket === "next7";
    });

    const customerNext30 = customerOpen.filter((row) => {
      const bucket = dueBucket(row.due_date);
      return bucket === "today" || bucket === "next7" || bucket === "next30";
    });

    const supplierNext30 = supplierOpen.filter((row) => {
      const bucket = dueBucket(row.due_date);
      return bucket === "today" || bucket === "next7" || bucket === "next30";
    });

    const importantIncoming = customerOpen
      .slice()
      .sort((a, b) => String(a.due_date || "9999").localeCompare(String(b.due_date || "9999")))
      .slice(0, 12)
      .map(invoiceRow);

    const importantOutgoing = supplierOpen
      .slice()
      .sort((a, b) => String(a.due_date || "9999").localeCompare(String(b.due_date || "9999")))
      .slice(0, 12)
      .map(supplierRow);

    const bankAccounts = (accounts || []).map((account: any) => ({
      id: account.id,
      account_label: account.account_label,
      bank_name: account.bank_name,
      account_type: account.account_type,
      account_number_masked: account.account_number_masked || mask(account.account_number),
      iban_masked: account.iban_masked || mask(account.iban),
      bic: account.bic,
      bankgiro: account.bankgiro,
      swish_number: account.swish_number,
      is_primary_invoice_account: Boolean(account.is_primary_invoice_account),
      is_primary_payroll_account: Boolean(account.is_primary_payroll_account),
      is_active: account.is_active !== false,
    }));

    return res.status(200).json({
      ok: true,
      today,
      supplierNeedsSetup,
      summary: {
        customerOpenAmount: round(customerTotal),
        supplierOpenAmount: round(supplierTotal),
        netOpenAmount: round(customerTotal - supplierTotal),

        customerOpenCount: customerOpen.length,
        supplierOpenCount: supplierOpen.length,

        customerOverdueAmount: round(customerOverdue.reduce((sum, row) => sum + amountDue(row), 0)),
        supplierOverdueAmount: round(supplierOverdue.reduce((sum, row) => sum + amountDue(row), 0)),
        customerOverdueCount: customerOverdue.length,
        supplierOverdueCount: supplierOverdue.length,

        customerNext7Amount: round(customerNext7.reduce((sum, row) => sum + amountDue(row), 0)),
        supplierNext7Amount: round(supplierNext7.reduce((sum, row) => sum + amountDue(row), 0)),
        customerNext30Amount: round(customerNext30.reduce((sum, row) => sum + amountDue(row), 0)),
        supplierNext30Amount: round(supplierNext30.reduce((sum, row) => sum + amountDue(row), 0)),

        netNext7Amount: round(
          customerNext7.reduce((sum, row) => sum + amountDue(row), 0) -
          supplierNext7.reduce((sum, row) => sum + amountDue(row), 0)
        ),

        netNext30Amount: round(
          customerNext30.reduce((sum, row) => sum + amountDue(row), 0) -
          supplierNext30.reduce((sum, row) => sum + amountDue(row), 0)
        ),
      },
      incomingBuckets: summarizeDue(customerOpen),
      outgoingBuckets: summarizeDue(supplierOpen),
      importantIncoming,
      importantOutgoing,
      bankAccounts,
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/betalningskontroll error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hämta betalningskontroll.",
    });
  }
}
