export type OfferStatus = string;

export type OfferRow = {
  id: string;
  offer_number: string;
  status?: OfferStatus | null;
  from: string;
  to: string;
  departure_date?: string | null;
  departure_time?: string | null;
  passengers?: number | null;
  total_price?: number | string | null;
  created_at?: string | null;
};

export type OverviewDTO = {
  totals: {
    offers_answered_kr: number;
    offers_approved_kr: number;
    bookings_kr: number;
    completed_kr: number;
  };
  incoming_offers: OfferRow[];
};
