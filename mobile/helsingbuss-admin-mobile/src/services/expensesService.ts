import { supabase } from "../lib/supabase";
import type { ExpensesOverview } from "../types/expenses";

const emptyExpenses: ExpensesOverview = {
  summary: {
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    overdueAmount: 0,
    totalCount: 0,
    paidCount: 0,
    pendingCount: 0,
    overdueCount: 0,
    monthAmount: 0,
    weekAmount: 0,
  },
  categories: [],
  recentExpenses: [],
};

export async function getExpensesOverview(): Promise<ExpensesOverview> {
  const { data, error } = await supabase.rpc("get_admin_expenses_overview");

  if (error) {
    console.log("Expenses overview error:", error);
    return emptyExpenses;
  }

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  return {
    summary: {
      totalAmount: Number(raw?.summary?.totalAmount || 0),
      paidAmount: Number(raw?.summary?.paidAmount || 0),
      pendingAmount: Number(raw?.summary?.pendingAmount || 0),
      overdueAmount: Number(raw?.summary?.overdueAmount || 0),
      totalCount: Number(raw?.summary?.totalCount || 0),
      paidCount: Number(raw?.summary?.paidCount || 0),
      pendingCount: Number(raw?.summary?.pendingCount || 0),
      overdueCount: Number(raw?.summary?.overdueCount || 0),
      monthAmount: Number(raw?.summary?.monthAmount || 0),
      weekAmount: Number(raw?.summary?.weekAmount || 0),
    },
    categories: Array.isArray(raw?.categories)
      ? raw.categories.map((item: any) => ({
          businessUnit: String(item.businessUnit || item.business_unit || ""),
          category: String(item.category || "other"),
          amount: Number(item.amount || 0),
          count: Number(item.count || 0),
        }))
      : [],
    recentExpenses: Array.isArray(raw?.recentExpenses)
      ? raw.recentExpenses.map((item: any) => ({
          id: String(item.id || ""),
          title: String(item.title || ""),
          supplierName: String(item.supplierName || ""),
          businessUnit: String(item.businessUnit || item.business_unit || ""),
          category: String(item.category || "other"),
          amount: Number(item.amount || 0),
          vatRate: Number(item.vatRate || 25),
          status: String(item.status || "pending"),
          paymentMethod: String(item.paymentMethod || ""),
          expenseDate: String(item.expenseDate || ""),
          dueDate: String(item.dueDate || ""),
          paidAt: String(item.paidAt || ""),
          receiptUrl: String(item.receiptUrl || ""),
          notes: String(item.notes || ""),
        }))
      : [],
  };
}

export async function saveExpense(input: {
  id?: string;
  title: string;
  supplierName?: string;
  businessUnit?: string;
  category?: string;
  amount: number;
  vatRate?: number;
  status?: string;
  paymentMethod?: string;
  expenseDate?: string;
  dueDate?: string;
  paidAt?: string;
  receiptUrl?: string;
  notes?: string;
}) {
  const { data: userData } = await supabase.auth.getUser();

  const payload = {
    title: input.title.trim(),
    supplier_name: input.supplierName?.trim() || null,
    business_unit: input.businessUnit?.trim() || null,
    category: input.category || "other",
    amount: Number(input.amount || 0),
    vat_rate: Number(input.vatRate || 25),
    status: input.status || "pending",
    payment_method: input.paymentMethod?.trim() || null,
    expense_date: input.expenseDate?.trim() || new Date().toISOString().slice(0, 10),
    due_date: input.dueDate?.trim() || null,
    paid_at: input.paidAt?.trim() || null,
    receipt_url: input.receiptUrl?.trim() || null,
    notes: input.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("app_expenses")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  const { data, error } = await supabase
    .from("app_expenses")
    .insert({
      ...payload,
      created_by: userData.user?.id || null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function archiveCompletedOffers() {
  const { data, error } = await supabase.rpc("archive_completed_offers");

  if (error) {
    console.log("Archive completed offers error:", error);
    return null;
  }

  return data;
}

export function getFallbackExpensesOverview() {
  return emptyExpenses;
}

export function formatExpenseMoney(amount: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function getExpenseCategoryLabel(category: string) {
  const clean = String(category || "").toLowerCase();

  if (clean === "operator") return "Operatör";
  if (clean === "fuel") return "Bränsle";
  if (clean === "staff") return "Personal";
  if (clean === "hotel") return "Hotell";
  if (clean === "ferry") return "Färja";
  if (clean === "maintenance") return "Service/underhåll";
  if (clean === "marketing") return "Marknadsföring";
  if (clean === "system") return "System/IT";

  return "Övrigt";
}

export function getExpenseStatusLabel(status: string) {
  const clean = String(status || "").toLowerCase();

  if (clean === "paid") return "Betald";
  if (clean === "pending") return "Väntar";
  if (clean === "overdue") return "Förfallen";
  if (clean === "cancelled") return "Makulerad";

  return status || "Okänd";
}

