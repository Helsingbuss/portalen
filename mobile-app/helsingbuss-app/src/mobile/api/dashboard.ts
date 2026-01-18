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
  return fetchJson<OverviewDTO>(`${API_BASE}/api/mobile/overview`, 15000);
}

export async function fetchAllOffers() {
  return fetchJson<OfferRow[]>(`${API_BASE}/api/mobile/offers`, 15000);
}

