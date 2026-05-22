export type ReportTicketItem = {
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
  category: "shuttle" | "trip" | "other" | string;
};

export type ReportTicketsOverview = {
  totals: {
    today: number;
    week: number;
    month: number;
    paid: number;
    pending: number;
    reserved: number;
    refunded: number;
    salesToday: number;
    salesWeek: number;
    salesMonth: number;
  };
  categories: {
    shuttle: number;
    trips: number;
    other: number;
  };
  recentTickets: ReportTicketItem[];
};
