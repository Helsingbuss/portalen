import { supabase } from "../lib/supabase";
import type { ReconciliationOverview } from "../types/reconciliation";

const emptyReconciliation: ReconciliationOverview = {
  summary: {
    storePaidAmount: 0,
    storePendingAmount: 0,
    storePaidCount: 0,
    storePendingCount: 0,

    invoicePaidAmount: 0,
    invoiceUnpaidAmount: 0,
    invoicePaidCount: 0,
    invoiceUnpaidCount: 0,
    invoiceOverdueCount: 0,

    bookingsValue: 0,
    bookingsCount: 0,

    offersAcceptedValue: 0,
    offersAcceptedCount: 0,

    expensesTotalAmount: 0,
    expensesPaidAmount: 0,
    expensesPendingAmount: 0,
    expensesOverdueAmount: 0,
    expensesTotalCount: 0,
    expensesPaidCount: 0,
    expensesPendingCount: 0,
    expensesOverdueCount: 0,

    totalReceived: 0,
    totalPending: 0,
    totalExpected: 0,
    totalCosts: 0,
    preliminaryResult: 0,
    expectedResult: 0,
    followUpAmount: 0,
  },
  followUpRows: [],
};

export async function getReconciliationOverview(): Promise<ReconciliationOverview> {
  const { data, error } = await supabase.rpc("get_admin_reconciliation_overview");

  if (error) {
    console.log("Reconciliation overview error:", error);
    return emptyReconciliation;
  }

  const raw = typeof data === "string" ? JSON.parse(data) : data;
  const s = raw?.summary || {};

  return {
    summary: {
      storePaidAmount: Number(s.storePaidAmount || 0),
      storePendingAmount: Number(s.storePendingAmount || 0),
      storePaidCount: Number(s.storePaidCount || 0),
      storePendingCount: Number(s.storePendingCount || 0),

      invoicePaidAmount: Number(s.invoicePaidAmount || 0),
      invoiceUnpaidAmount: Number(s.invoiceUnpaidAmount || 0),
      invoicePaidCount: Number(s.invoicePaidCount || 0),
      invoiceUnpaidCount: Number(s.invoiceUnpaidCount || 0),
      invoiceOverdueCount: Number(s.invoiceOverdueCount || 0),

      bookingsValue: Number(s.bookingsValue || 0),
      bookingsCount: Number(s.bookingsCount || 0),

      offersAcceptedValue: Number(s.offersAcceptedValue || 0),
      offersAcceptedCount: Number(s.offersAcceptedCount || 0),

      expensesTotalAmount: Number(s.expensesTotalAmount || 0),
      expensesPaidAmount: Number(s.expensesPaidAmount || 0),
      expensesPendingAmount: Number(s.expensesPendingAmount || 0),
      expensesOverdueAmount: Number(s.expensesOverdueAmount || 0),
      expensesTotalCount: Number(s.expensesTotalCount || 0),
      expensesPaidCount: Number(s.expensesPaidCount || 0),
      expensesPendingCount: Number(s.expensesPendingCount || 0),
      expensesOverdueCount: Number(s.expensesOverdueCount || 0),

      totalReceived: Number(s.totalReceived || 0),
      totalPending: Number(s.totalPending || 0),
      totalExpected: Number(s.totalExpected || 0),
      totalCosts: Number(s.totalCosts || 0),
      preliminaryResult: Number(s.preliminaryResult || 0),
      expectedResult: Number(s.expectedResult || 0),
      followUpAmount: Number(s.followUpAmount || 0),
    },
    followUpRows: Array.isArray(raw?.followUpRows)
      ? raw.followUpRows.map((item: any) => ({
          id: String(item.id || ""),
          type: String(item.type || ""),
          label: String(item.label || ""),
          reference: String(item.reference || ""),
          title: String(item.title || ""),
          customer: String(item.customer || ""),
          amount: Number(item.amount || 0),
          status: String(item.status || ""),
          createdAt: String(item.createdAt || ""),
          dueDate: String(item.dueDate || ""),
        }))
      : [],
  };
}

export function getFallbackReconciliationOverview() {
  return emptyReconciliation;
}

export function formatReconciliationMoney(amount: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function formatReconciliationDate(value?: string) {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export function getReconciliationStatusLabel(status: string) {
  const clean = String(status || "").toLowerCase();

  if (clean === "paid") return "Betald";
  if (clean === "pending") return "Väntar";
  if (clean === "reserved") return "Reserverad";
  if (clean === "draft") return "Utkast";
  if (clean === "sent") return "Skickad";
  if (clean === "overdue") return "Förfallen";
  if (clean === "failed") return "Misslyckad";

  return status || "Okänd";
}
