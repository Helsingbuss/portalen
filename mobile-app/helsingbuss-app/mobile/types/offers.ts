export type OfferStatus = "inkommen" | "besvarad" | "godkand" | "avböjd" | "makulerad" | string;

export type Offer = {
  id: string;
  offer_number: string;
  status: OfferStatus;
  from: string;
  to: string;
  departure_date: string | null;
  departure_time: string | null;
  passengers: number | null;
  total_price: number | null;
};
