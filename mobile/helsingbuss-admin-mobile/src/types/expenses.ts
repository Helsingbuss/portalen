export type ExpenseItem = {
  businessUnit?: string;
  id: string;
  title: string;
  supplierName?: string;
  category: string;
  amount: number;
  vatRate: number;
  status: string;
  paymentMethod?: string;
  expenseDate?: string;
  dueDate?: string;
  paidAt?: string;
  receiptUrl?: string;
  notes?: string;
};

export type ExpenseCategorySummary = {
  category: string;
  amount: number;
  count: number;
};

export type ExpensesOverview = {
  summary: {
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    overdueAmount: number;
    totalCount: number;
    paidCount: number;
    pendingCount: number;
    overdueCount: number;
    monthAmount: number;
    weekAmount: number;
  };
  categories: ExpenseCategorySummary[];
  recentExpenses: ExpenseItem[];
};

