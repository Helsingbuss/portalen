import { API_BASE, fetchJson } from "../lib/apiConfig";

export type OverviewDTO = {
  totals: {
    offers_answered_kr: number;
    offers_approved_kr: number;
    bookings_kr: number;
    completed_kr: number;
  };
  incoming_offers: Array<{
    id: string;
    offer_number: string;
    status: string | null;
    from: string;
    to: string;
    departure_date: string | null;
    departure_time: string | null;
    passengers: number | null;
    total_price: number | null;
  }>;
};

export type OfferRow = {
  id: string;
  offer_number: string;
  status: string | null;
  from: string;
  to: string;
  departure_date: string | null;
  departure_time: string | null;
  passengers: number | null;
  total_price: number | null;
  created_at?: string;
};

export async function fetchOverview() {
  return fetchJson<OverviewDTO>(`${API_BASE}/api/mobile/overview`);
}

export async function fetchAllOffers() {
  return fetchJson<OfferRow[]>(`${API_BASE}/api/mobile/offers`);
}



export async function fetchDashboardSummary(): Promise<any> {
  const dto: any = await fetchOverview();

  return {
    totalBookings: dto.totalBookings ?? dto.bookingsTotal ?? 0,
    todayBookings: dto.todayBookings ?? dto.bookingsToday ?? 0,
    pendingOffers: dto.pendingOffers ?? dto.openOffers ?? dto.offersOpen ?? 0,
    openOffers: dto.openOffers ?? dto.offersOpen ?? 0,
    upcomingDepartures: dto.upcomingDepartures ?? dto.upcomingTrips ?? 0,
    revenueToday: dto.revenueToday ?? dto.todayRevenue ?? 0,
    todayRevenue: dto.todayRevenue ?? dto.revenueToday ?? 0,
  };
}

export async function fetchIncomingOffers(): Promise<any[]> {
  const rows: any[] = await fetchAllOffers();

  return rows.map((row: any) => ({
    id: String(row.id),
    offerNumber: row.offerNumber ?? row.offer_number ?? row.number ?? String(row.id),
    customerName: row.customerName ?? row.customer_name ?? row.customer ?? row.name ?? "Kund saknas",
    from: row.from ?? row.departure_place ?? row.departure ?? "Från saknas",
    to: row.to ?? row.destination ?? row.route ?? "Destination saknas",
    destination: row.destination ?? row.to ?? row.route ?? "Destination saknas",
    date: row.date ?? row.departure_date ?? row.created_at ?? "",
    status: row.status ?? "inkommen",
    price: row.price ?? row.total_price ?? row.amount ?? 0,
  }));
}

export async function fetchNews(): Promise<any[]> {
  return [];
}