import { apiGet, apiPost } from "./client";
import type { Offer } from "@/mobile/types/offers";

export type OverviewDTO = {
  totals: {
    offers_answered_kr: number;
    offers_approved_kr: number;
    bookings_kr: number;
    completed_kr: number;
  };
  incoming_offers: Array<Offer>;
};

export async function fetchOverview(): Promise<OverviewDTO> {
  return apiGet<OverviewDTO>("/api/mobile/overview");
}

export async function fetchOffers(): Promise<Offer[]> {
  return apiGet<Offer[]>("/api/mobile/offers");
}

export async function fetchOfferById(id: string): Promise<Offer> {
  return apiGet<Offer>(`/api/mobile/offers/${id}`);
}

/**
 * Besvara offert (koppla till din kalkyl i portalen):
 * - Du kan låta portalen räkna pris och spara svaret i Supabase.
 */
export async function replyOffer(id: string, payload: { message: string; suggested_price: number | null }) {
  return apiPost<{ ok: boolean }>(`/api/mobile/offers/${id}/reply`, payload);
}
