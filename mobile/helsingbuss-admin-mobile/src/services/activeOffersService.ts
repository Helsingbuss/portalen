import { supabase } from "../lib/supabase";
import type { ActiveOffersOverview } from "../types/activeOffers";

const emptyActiveOffers: ActiveOffersOverview = {
  summary: {
    total: 0,
    value: 0,
  },
  offers: [],
};

export async function getActiveOffers(): Promise<ActiveOffersOverview> {
  const { data, error } = await supabase.rpc("get_admin_active_offers");

  if (error) {
    console.log("Active offers error:", error);
    return emptyActiveOffers;
  }

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  return {
    summary: {
      total: Number(raw?.summary?.total || 0),
      value: Number(raw?.summary?.value || 0),
    },
    offers: Array.isArray(raw?.offers)
      ? raw.offers.map((item: any) => ({
          id: String(item.id || ""),
          reference: String(item.reference || ""),
          customerName: String(item.customerName || ""),
          customerEmail: String(item.customerEmail || ""),
          customerPhone: String(item.customerPhone || ""),
          departure: String(item.departure || ""),
          destination: String(item.destination || ""),
          tripType: String(item.tripType || ""),
          travelDate: String(item.travelDate || ""),
          amount: Number(item.amount || 0),
          status: String(item.status || ""),
        }))
      : [],
  };
}

export function getFallbackActiveOffers() {
  return emptyActiveOffers;
}

export function formatActiveOfferMoney(amount: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function formatActiveOfferDate(value?: string) {
  if (!value) return "";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export function getActiveOfferStatusLabel(status: string) {
  const clean = String(status || "").toLowerCase();

  if (clean === "inkommen") return "Inkommen";
  if (clean === "besvarad") return "Besvarad";
  if (clean === "avböjd" || clean === "avbojd") return "Avböjd";
  if (clean === "accepted") return "Accepterad";
  if (clean === "godkänd" || clean === "godkand") return "Godkänd";
  if (clean === "booked" || clean === "bokad") return "Bokad";
  if (clean === "confirmed" || clean === "bekräftad" || clean === "bekraftad") return "Bekräftad";

  return status || "Okänd";
}
