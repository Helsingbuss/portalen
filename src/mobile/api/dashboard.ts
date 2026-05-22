export type OverviewDTO = {
  totals?: any;
  incoming_offers?: OfferRow[];
  totalBookings?: number;
  todayBookings?: number;
  pendingOffers?: number;
  openOffers?: number;
  upcomingDepartures?: number;
  revenueToday?: number;
  todayRevenue?: number;
};

export type OfferRow = {
  id: string;
  offerNumber?: string;
  customerName?: string;
  from?: string;
  to?: string;
  destination?: string;
  date?: string;
  status?: string;
  price?: number;
};

export async function fetchOverview(): Promise<OverviewDTO> {
  return { incoming_offers: [], totals: {} };
}

export async function fetchAllOffers(): Promise<OfferRow[]> {
  return [];
}

export async function fetchDashboardSummary(): Promise<any> {
  return { incoming_offers: [], totals: {} };
}

export async function fetchIncomingOffers(): Promise<any[]> {
  return [];
}

export async function fetchNews(): Promise<any[]> {
  return [];
}
