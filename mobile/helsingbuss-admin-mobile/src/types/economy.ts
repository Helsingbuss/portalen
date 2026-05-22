export type EconomyPaymentItem = {
  id: string;
  reference: string;
  title: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  amount: number;
  currency: string;
  status: string;
  paymentUrl?: string;
  createdAt?: string;
};

export type EconomyOverview = {
  summary: {
    storeSales: number;
    pendingAmount: number;
    bookingsValue: number;
    offersAcceptedValue: number;
    totalVisibleValue: number;
  };
  payments: {
    paidCount: number;
    pendingCount: number;
    refundedCount: number;
  };
  bookings: {
    total: number;
    value: number;
    toInvoice: number;
  };
  offers: {
    total: number;
    accepted: number;
    value: number;
    acceptedValue: number;
  };
  customers: {
    total: number;
  };
  recentPayments: EconomyPaymentItem[];
};
