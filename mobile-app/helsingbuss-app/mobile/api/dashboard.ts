import { fetchJson } from "./config";

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
    created_at?: string | null;
  }>;
};

export type OfferDTO = {
  id: string;
  offer_number: string;
  status: string | null;
  from: string;
  to: string;
  departure_date: string | null;
  departure_time: string | null;
  passengers: number | null;
  total_price: number | null;
  created_at?: string | null;
};

export function fetchOverview() {
  return fetchJson<OverviewDTO>("/api/mobile/overview");
}

export function fetchAllOffers() {
  return fetchJson<OfferDTO[]>("/api/mobile/offers");
}
