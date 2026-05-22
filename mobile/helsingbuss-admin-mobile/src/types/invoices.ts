export type InvoiceItem = {
  businessUnit?: string;
  id: string;
  source: "invoice" | "booking_candidate" | string;
  invoiceNumber?: string;
  sourceType?: string;
  sourceId?: string;
  reference?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  title: string;
  amount: number;
  vatRate: number;
  vatAmount: number;
  exVat: number;
  status: string;
  dueDate?: string;
  notes?: string;
  createdAt?: string;
  sentAt?: string;
  sentTo?: string;
  reminderCount?: number;
  lastReminderAt?: string;
  lastReminderTo?: string;
};

export type InvoicesOverview = {
  summary: {
    invoiceTotal: number;
    draftCount: number;
    sentCount: number;
    paidCount: number;
    overdueCount: number;
    invoiceAmount: number;
    unpaidAmount: number;
    paidAmount: number;
    candidateCount: number;
    candidateAmount: number;
  };
  invoices: InvoiceItem[];
  candidates: InvoiceItem[];
};

