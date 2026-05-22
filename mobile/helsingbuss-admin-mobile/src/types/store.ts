export type StoreProductType =
  | "shuttle_ticket"
  | "trip_ticket"
  | "booking"
  | "offer"
  | "custom";

export type StoreProduct = {
  id: string;
  title: string;
  subtitle: string;
  type: StoreProductType;
  priceFrom?: number;
  available?: number;
  status?: string;
};

export type StorePaymentItem = {
  id: string;
  title: string;
  customer: string;
  amount: number;
  status: "reserved" | "pending" | "paid" | "cancelled" | "refunded" | string;
  createdAt: string;
  paymentUrl?: string;
  reference?: string;
};

export type StoreOverview = {
  todaySales: number;
  pendingPayments: number;
  reservedItems: number;
  paidToday: number;
  products: StoreProduct[];
  recentPayments: StorePaymentItem[];
};
