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

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
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

function amountDue(row: any) {
  return n(row.unpaid_amount || row.total_amount);
}

function daysUntil(dueDate?: string | null) {
  if (!dueDate) return null;

  const today = new Date(todayDate() + "T00:00:00");
  const due = new Date(dueDate + "T00:00:00");

  if (Number.isNaN(due.getTime())) return null;

  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function customerRow(row: any) {
  return {
    id: row.id,
    type: "customer",
    invoice_number: row.invoice_number,
    ocr_number: row.ocr_number,
    name: row.customer_name,
    email: row.customer_email,
    due_date: row.due_date,
    invoice_date: row.invoice_date,
    amount: round(amountDue(row)),
    total_amount: round(n(row.total_amount)),
    status: row.status,
    days_until_due: daysUntil(row.due_date),
    reminder_count: n(row.reminder_count),
    last_reminder_sent_at: row.last_reminder_sent_at,
    next_reminder_date: row.next_reminder_date,
    href: "/admin/ekonomi/fakturor/" + row.id,
  };
}

function supplierRow(row: any) {
  return {
    id: row.id,
    type: "supplier",
    invoice_number: row.supplier_invoice_number,
    ocr_number: row.ocr_number,
    name: row.supplier_name,
    email: row.supplier_email,
    due_date: row.due_date,
    invoice_date: row.invoice_date,
    amount: round(amountDue(row)),
    total_amount: round(n(row.total_amount)),
    status: row.status,
    days_until_due: daysUntil(row.due_date),
    href: "/admin/ekonomi/leverantorsreskontra/" + row.id,
  };
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
    const next7 = addDays(7);
    const next14 = addDays(14);

    const { data: customersRaw, error: customersError } = await supabase
      .from("finance_invoices")
      .select("*")
      .order("due_date", { ascending: true })
      .limit(1000);

    if (customersError) throw customersError;

    const customerOpen = (customersRaw || [])
      .filter((row) => !isArchived(row.status))
      .filter((row) => !isPaid(row.status))
      .filter((row) => amountDue(row) > 0);

    const customerOverdue = customerOpen
      .filter((row) => row.due_date && row.due_date < today)
      .map(customerRow);

    const customerDueSoon = customerOpen
      .filter((row) => row.due_date && row.due_date >= today && row.due_date <= next7)
      .map(customerRow);

    const customerUpcoming = customerOpen
      .filter((row) => row.due_date && row.due_date > next7 && row.due_date <= next14)
      .map(customerRow);

    let supplierNeedsSetup = false;
    let supplierOpen: any[] = [];

    const { data: suppliersRaw, error: suppliersError } = await supabase
      .from("supplier_invoices")
      .select("*")
      .order("due_date", { ascending: true })
      .limit(1000);

    if (suppliersError) {
      if (isMissingTableError(suppliersError)) {
        supplierNeedsSetup = true;
      } else {
        throw suppliersError;
      }
    } else {
      supplierOpen = (suppliersRaw || [])
        .filter((row) => !isArchived(row.status))
        .filter((row) => !isPaid(row.status))
        .filter((row) => amountDue(row) > 0);
    }

    const supplierOverdue = supplierOpen
      .filter((row) => row.due_date && row.due_date < today)
      .map(supplierRow);

    const supplierDueSoon = supplierOpen
      .filter((row) => row.due_date && row.due_date >= today && row.due_date <= next7)
      .map(supplierRow);

    const supplierUpcoming = supplierOpen
      .filter((row) => row.due_date && row.due_date > next7 && row.due_date <= next14)
      .map(supplierRow);

    const customerOverdueAmount = customerOverdue.reduce((sum, row) => sum + row.amount, 0);
    const supplierOverdueAmount = supplierOverdue.reduce((sum, row) => sum + row.amount, 0);

    return res.status(200).json({
      ok: true,
      today,
      supplierNeedsSetup,
      summary: {
        customerOverdueCount: customerOverdue.length,
        customerOverdueAmount: round(customerOverdueAmount),
        customerDueSoonCount: customerDueSoon.length,
        customerDueSoonAmount: round(customerDueSoon.reduce((sum, row) => sum + row.amount, 0)),

        supplierOverdueCount: supplierOverdue.length,
        supplierOverdueAmount: round(supplierOverdueAmount),
        supplierDueSoonCount: supplierDueSoon.length,
        supplierDueSoonAmount: round(supplierDueSoon.reduce((sum, row) => sum + row.amount, 0)),

        netOverdue: round(customerOverdueAmount - supplierOverdueAmount),
      },
      customerOverdue,
      customerDueSoon,
      customerUpcoming,
      supplierOverdue,
      supplierDueSoon,
      supplierUpcoming,
    });
  } catch (error: any) {
    console.error("/api/admin/ekonomi/betalningspaminnelser error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hämta påminnelser och betalstatus.",
    });
  }
}
