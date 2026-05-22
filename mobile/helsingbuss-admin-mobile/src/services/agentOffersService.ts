import { supabase } from "../lib/supabase";

export type AgentOfferItem = {
  id: string;
  reference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  departure: string;
  destination: string;
  travelDate: string;
  status: string;
  amount: number;
  raw: any;
};

export type AgentOffersOverview = {
  summary: {
    total: number;
    incoming: number;
    answered: number;
    accepted: number;
    declined: number;
  };
  offers: AgentOfferItem[];
};

const fallback: AgentOffersOverview = {
  summary: {
    total: 0,
    incoming: 0,
    answered: 0,
    accepted: 0,
    declined: 0,
  },
  offers: [],
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
  const value = pick(row, [
    "total_price",
    "price_amount",
    "totalPrice",
    "amount",
    "price",
    "final_price",
    "total",
  ]);

  return Number(value || 0);
}

export async function getAgentOffersOverview(): Promise<AgentOffersOverview> {
  const { data, error } = await supabase.rpc("get_agent_offers_overview");

  if (error) {
    console.log("get_agent_offers_overview error:", error.message);
    return fallback;
  }

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  return {
    summary: {
      total: Number(raw?.summary?.total || 0),
      incoming: Number(raw?.summary?.incoming || 0),
      answered: Number(raw?.summary?.answered || 0),
      accepted: Number(raw?.summary?.accepted || 0),
      declined: Number(raw?.summary?.declined || 0),
    },
    offers: Array.isArray(raw?.offers)
      ? raw.offers.map((row: any) => {
          const id = String(pick(row, ["id", "uuid"]) || "");

          return {
            id,
            reference: String(
              pick(row, [
                "offer_number",
                "offerNumber",
                "reference",
                "synergybus_id",
                "id",
              ]) || ""
            ),
            customerName: String(
              pick(row, [
                "customer_name",
                "customerName",
                "Namn_efternamn",
                "contact_person",
                "foretag_forening",
              ]) || ""
            ),
            customerEmail: String(
              pick(row, ["customer_email", "customerEmail", "email"]) || ""
            ),
            customerPhone: String(
              pick(row, ["customer_phone", "customerPhone", "phone"]) || ""
            ),
            departure: String(
              pick(row, [
                "departure_place",
                "departure",
                "departure_city",
                "from",
              ]) || ""
            ),
            destination: String(
              pick(row, [
                "destination",
                "destination_city",
                "final_destination",
                "to",
              ]) || ""
            ),
            travelDate: String(
              pick(row, [
                "departure_date",
                "travel_date",
                "date",
                "offer_date",
                "created_at",
                "added_at",
              ]) || ""
            ),
            status: String(pick(row, ["status"]) || "inkommen"),
            amount: getAmount(row),
            raw: row,
          };
        })
      : [],
  };
}

export function formatAgentOfferMoney(value: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatAgentOfferDate(value?: string) {
  if (!value) return "";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export function getAgentOfferStatusLabel(status: string) {
  const clean = String(status || "").toLowerCase();

  if (["", "inkommen", "ny", "new", "incoming", "draft"].includes(clean)) return "Inkommen";
  if (["besvarad", "answered", "sent", "proposal_sent", "calculated", "ready_to_send"].includes(clean)) return "Besvarad";
  if (["godkänd", "godkand", "accepted", "bokad", "booked", "confirmed", "bekräftad", "bekraftad"].includes(clean)) return "Godkänd";
  if (["avböjd", "avbojd", "declined", "rejected", "lost"].includes(clean)) return "Avböjd";

  return status || "Inkommen";
}
