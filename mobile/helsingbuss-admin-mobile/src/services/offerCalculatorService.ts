import { supabase } from "../lib/supabase";
import type { OfferCalculatorOffer, OfferCalculatorResult } from "../types/offerCalculator";

export async function getOfferCalculator(offerId: string): Promise<OfferCalculatorOffer> {
  const { data, error } = await supabase.rpc("get_admin_offer_calculator", {
    p_offer_id: offerId,
  });

  if (error) throw new Error(error.message);

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  if (!raw?.ok) {
    throw new Error(raw?.error || "Offerten hittades inte.");
  }

  const offer = raw.offer || {};

  return {
    id: String(offer.id || ""),
    reference: String(offer.reference || ""),
    customerName: String(offer.customerName || ""),
    customerEmail: String(offer.customerEmail || ""),
    customerPhone: String(offer.customerPhone || ""),
    departure: String(offer.departure || ""),
    destination: String(offer.destination || ""),
    travelDate: String(offer.travelDate || ""),
    status: String(offer.status || ""),
    calculator: offer.calculator || {},
    priceExVat: Number(offer.priceExVat || 0),
    priceVatAmount: Number(offer.priceVatAmount || 0),
    priceTotal: Number(offer.priceTotal || 0),
    priceVatRate: Number(offer.priceVatRate || 6),
    priceNote: String(offer.priceNote || ""),
    proposalStatus: String(offer.proposalStatus || ""),
  };
}

export async function saveOfferCalculator(input: {
  offerId: string;
  calculation: any;
  result: OfferCalculatorResult;
  priceNote?: string;
  proposalStatus?: string;
}) {
  const { data, error } = await supabase.rpc("save_admin_offer_calculator", {
    p_offer_id: input.offerId,
    p_calculation: input.calculation,
    p_price_ex_vat: input.result.exVat,
    p_price_vat_amount: input.result.vatAmount,
    p_price_total: input.result.total,
    p_price_vat_rate: input.result.vatRate,
    p_price_note: input.priceNote || "",
    p_proposal_status: input.proposalStatus || "calculated",
  });

  if (error) throw new Error(error.message);

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  if (!raw?.ok) {
    throw new Error("Kalkylen kunde inte sparas på offerten.");
  }

  return raw;
}

export function formatOfferCalculatorMoney(amount: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}
