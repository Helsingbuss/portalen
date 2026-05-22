export type ReconciliationRow = {
  id: string;
  type: "store" | "invoice" | "expense" | string;
  label: string;
  reference: string;
  title: string;
  customer?: string;
  amount: number;
  status: string;
  createdAt?: string;
  dueDate?: string;
};

export type ReconciliationOverview = {
  summary: {
    storePaidAmount: number;
    storePendingAmount: number;
    storePaidCount: number;
    storePendingCount: number;

    invoicePaidAmount: number;
    invoiceUnpaidAmount: number;
    invoicePaidCount: number;
    invoiceUnpaidCount: number;
    invoiceOverdueCount: number;

    bookingsValue: number;
    bookingsCount: number;

    offersAcceptedValue: number;
    offersAcceptedCount: number;

    expensesTotalAmount: number;
    expensesPaidAmount: number;
    expensesPendingAmount: number;
    expensesOverdueAmount: number;
    expensesTotalCount: number;
    expensesPaidCount: number;
    expensesPendingCount: number;
    expensesOverdueCount: number;

    totalReceived: number;
    totalPending: number;
    totalExpected: number;
    totalCosts: number;
    preliminaryResult: number;
    expectedResult: number;
    followUpAmount: number;
  };
  followUpRows: ReconciliationRow[];
};
