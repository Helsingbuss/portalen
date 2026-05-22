import { supabase } from "../lib/supabase";
import type { InvoicesOverview } from "../types/invoices";

const emptyInvoices: InvoicesOverview = {
  summary: {
    invoiceTotal: 0,
    draftCount: 0,
    sentCount: 0,
    paidCount: 0,
    overdueCount: 0,
    invoiceAmount: 0,
    unpaidAmount: 0,
    paidAmount: 0,
    candidateCount: 0,
    candidateAmount: 0,
  },
  invoices: [],
  candidates: [],
};

export async function getInvoicesOverview(): Promise<InvoicesOverview> {
  try { await supabase.rpc("refresh_app_invoice_overdue_status"); } catch {}

  const { data, error } = await supabase.rpc("get_admin_invoices_overview");

  if (error) {
    console.log("Invoices overview error:", error);
    return emptyInvoices;
  }

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  return {
    summary: {
      invoiceTotal: Number(raw?.summary?.invoiceTotal || 0),
      draftCount: Number(raw?.summary?.draftCount || 0),
      sentCount: Number(raw?.summary?.sentCount || 0),
      paidCount: Number(raw?.summary?.paidCount || 0),
      overdueCount: Number(raw?.summary?.overdueCount || 0),
      invoiceAmount: Number(raw?.summary?.invoiceAmount || 0),
      unpaidAmount: Number(raw?.summary?.unpaidAmount || 0),
      paidAmount: Number(raw?.summary?.paidAmount || 0),
      candidateCount: Number(raw?.summary?.candidateCount || 0),
      candidateAmount: Number(raw?.summary?.candidateAmount || 0),
    },
    invoices: Array.isArray(raw?.invoices) ? raw.invoices.map(normalizeInvoice) : [],
    candidates: Array.isArray(raw?.candidates) ? raw.candidates.map(normalizeInvoice) : [],
  };
}

function normalizeInvoice(item: any) {
  return {
    id: String(item.id || ""),
    source: String(item.source || "invoice"),
    invoiceNumber: String(item.invoiceNumber || item.invoice_number || ""),
    sourceType: String(item.sourceType || item.source_type || ""),
    sourceId: String(item.sourceId || item.source_id || ""),
    reference: String(item.reference || ""),
    customerName: String(item.customerName || item.customer_name || ""),
    customerEmail: String(item.customerEmail || item.customer_email || ""),
    customerPhone: String(item.customerPhone || item.customer_phone || ""),
    businessUnit: String(item.businessUnit || item.business_unit || ""),
    title: String(item.title || "Faktura"),
    amount: Number(item.amount || 0),
    vatRate: Number(item.vatRate || item.vat_rate || 6),
    vatAmount: Number(item.vatAmount || item.vat_amount || 0),
    exVat: Number(item.exVat || item.ex_vat || 0),
    status: String(item.status || "draft"),
    dueDate: String(item.dueDate || item.due_date || ""),
    notes: String(item.notes || ""),
    createdAt: String(item.createdAt || item.created_at || ""),
    sentAt: String(item.sentAt || item.sent_at || ""),
    sentTo: String(item.sentTo || item.last_sent_to || ""),
    reminderCount: Number(item.reminderCount || item.reminder_count || 0),
    lastReminderAt: String(item.lastReminderAt || item.last_reminder_at || ""),
    lastReminderTo: String(item.lastReminderTo || item.last_reminder_to || ""),
  };
}

export async function saveInvoice(input: {
  id?: string;
  invoiceNumber?: string;
  sourceType?: string;
  sourceId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  businessUnit?: string;
  title: string;
  amount: number;
  vatRate?: number;
  status?: string;
  dueDate?: string;
  notes?: string;
}) {
  const { data: userData } = await supabase.auth.getUser();

  const payload = {
    invoice_number: input.invoiceNumber?.trim() || null,
    source_type: input.sourceType?.trim() || null,
    source_id: input.sourceId?.trim() || null,
    customer_name: input.customerName?.trim() || null,
    customer_email: input.customerEmail?.trim() || null,
    customer_phone: input.customerPhone?.trim() || null,
    business_unit: input.businessUnit?.trim() || null,
    title: input.title.trim(),
    amount: Number(input.amount || 0),
    vat_rate: Number(input.vatRate || 6),
    status: input.status || "draft",
    due_date: input.dueDate?.trim() || null,
    notes: input.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("app_invoices")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  const { data, error } = await supabase
    .from("app_invoices")
    .insert({
      ...payload,
      created_by: userData.user?.id || null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getInvoiceById(invoiceId: string) {
  const { data, error } = await supabase
    .from("app_invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();

  if (error) throw new Error(error.message);

  const amount = Number(data.amount || 0);
  const vatRate = Number(data.vat_rate || 6);
  const vatAmount = amount * vatRate / (100 + vatRate);
  const exVat = amount - vatAmount;

  return normalizeInvoice({
    id: data.id,
    source: "invoice",
    invoiceNumber: data.invoice_number,
    sourceType: data.source_type,
    sourceId: data.source_id,
    customerName: data.customer_name,
    customerEmail: data.customer_email,
    customerPhone: data.customer_phone,
    businessUnit: data.business_unit,
    title: data.title,
    amount: data.amount,
    vatRate: data.vat_rate,
    vatAmount,
    exVat,
    status: data.status,
    dueDate: data.due_date,
    notes: data.notes,
    createdAt: data.created_at,
    sentAt: data.sent_at,
    sentTo: data.last_sent_to,
    reminderCount: data.reminder_count,
    lastReminderAt: data.last_reminder_at,
    lastReminderTo: data.last_reminder_to,
  });
}

export async function updateInvoiceStatus(invoiceId: string, status: string) {
  const { data, error } = await supabase
    .from("app_invoices")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoiceId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export function getFallbackInvoicesOverview() {
  return emptyInvoices;
}

export function formatInvoiceMoney(amount: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function formatInvoiceDate(value?: string) {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export function getInvoiceStatusLabel(status: string) {
  const clean = String(status || "").toLowerCase();

  if (clean === "draft") return "Utkast";
  if (clean === "sent") return "Skickad";
  if (clean === "paid") return "Betald";
  if (clean === "overdue") return "Förfallen";
  if (clean === "cancelled") return "Makulerad";
  if (clean === "booking_candidate") return "Att fakturera";

  return status || "Okänd";
}

