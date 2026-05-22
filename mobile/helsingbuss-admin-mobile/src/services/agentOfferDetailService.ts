import { supabase } from "../lib/supabase";

export type AgentOfferDetail = {
  id: string;
  reference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  company: string;
  departure: string;
  destination: string;
  departureDate: string;
  departureTime: string;
  returnDate: string;
  returnTime: string;
  passengers: number;
  status: string;
  amount: number;
  notes: string;
  raw: any;
};

export type AgentOfferProposal = {
  id: string;
  internalCost: number;
  marginPercent: number;
  priceAmount: number;
  customerPrice: number;
  notes: string;
  status: string;
};

function pick(row: any, keys: string[]) {
  for (const key of keys) {
    const value = row?.[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return "";
}

function getAmount(row: any) {
  return Number(
    pick(row, [
      "total_price",
      "price_amount",
      "totalPrice",
      "amount",
      "price",
      "final_price",
      "total",
    ]) || 0
  );
}

export function mapAgentOfferDetail(row: any): AgentOfferDetail {
  return {
    id: String(pick(row, ["id", "uuid"]) || ""),
    reference: String(
      pick(row, ["offer_number", "offerNumber", "reference", "synergybus_id", "id"]) || ""
    ),
    customerName: String(
      pick(row, ["customer_name", "customerName", "Namn_efternamn", "contact_person"]) || ""
    ),
    customerEmail: String(pick(row, ["customer_email", "customerEmail", "email"]) || ""),
    customerPhone: String(pick(row, ["customer_phone", "customerPhone", "phone"]) || ""),
    company: String(pick(row, ["foretag_forening", "company", "company_name"]) || ""),
    departure: String(
      pick(row, ["departure_place", "departure", "departure_city", "from"]) || ""
    ),
    destination: String(
      pick(row, ["destination", "destination_city", "final_destination", "to"]) || ""
    ),
    departureDate: String(
      pick(row, ["departure_date", "travel_date", "date", "offer_date", "created_at", "added_at"]) || ""
    ),
    departureTime: String(pick(row, ["departure_time", "time", "pickup_time"]) || ""),
    returnDate: String(pick(row, ["return_date"]) || ""),
    returnTime: String(pick(row, ["return_time"]) || ""),
    passengers: Number(pick(row, ["passengers", "pax", "antal_resenarer"]) || 0),
    status: String(pick(row, ["status"]) || "inkommen"),
    amount: getAmount(row),
    notes: String(pick(row, ["notes", "comment", "message", "description"]) || ""),
    raw: row,
  };
}

function mapProposal(row: any): AgentOfferProposal {
  return {
    id: String(row?.id || ""),
    internalCost: Number(row?.internal_cost || 0),
    marginPercent: Number(row?.margin_percent || 0),
    priceAmount: Number(row?.price_amount || 0),
    customerPrice: Number(row?.customer_price || 0),
    notes: String(row?.notes || ""),
    status: String(row?.status || ""),
  };
}

export async function getAgentOfferDetail(id: string): Promise<{
  offer: AgentOfferDetail | null;
  proposal: AgentOfferProposal | null;
}> {
  const { data, error } = await supabase.rpc("get_agent_offer_detail", {
    p_offer_id: id,
  });

  if (error) {
    console.log("get_agent_offer_detail error:", error.message);
    return { offer: null, proposal: null };
  }

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  if (!raw?.ok) {
    console.log("get_agent_offer_detail response:", raw?.error);
    return { offer: null, proposal: null };
  }

  return {
    offer: mapAgentOfferDetail(raw.offer),
    proposal:
      raw.proposal && Object.keys(raw.proposal).length > 0
        ? mapProposal(raw.proposal)
        : null,
  };
}

export async function saveAgentOfferPriceProposal(input: {
  offerId: string;
  internalCost: number;
  marginPercent: number;
  priceAmount: number;
  customerPrice: number;
  notes: string;
}) {
  const { data, error } = await supabase.rpc("save_agent_offer_price_proposal", {
    p_offer_id: input.offerId,
    p_internal_cost: input.internalCost,
    p_margin_percent: input.marginPercent,
    p_price_amount: input.priceAmount,
    p_customer_price: input.customerPrice,
    p_notes: input.notes,
  });

  if (error) {
    throw new Error(error.message);
  }

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  if (!raw?.ok) {
    throw new Error(raw?.error || "Kunde inte spara prisförslag.");
  }

  return raw;
}

export function formatAgentOfferDetailMoney(value: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatAgentOfferDetailDate(value?: string) {
  if (!value) return "Ej angivet";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}
