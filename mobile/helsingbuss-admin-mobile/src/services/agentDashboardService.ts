import { supabase } from "../lib/supabase";

export type AgentDashboardRow = {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  date: string;
  amount: number;
  raw: any;
};

export type AgentDashboardOverview = {
  agent: {
    id: string;
    name: string;
    email: string;
    status: string;
    commissionPercent: number;
  };
  summary: {
    totalOffers: number;
    incomingOffers: number;
    answeredOffers: number;
    acceptedOffers: number;
    declinedOffers: number;
    bookings: number;
    tickets: number;
    vehiclesInTraffic: number;
    newMessages: number;
  };
  recentOffers: AgentDashboardRow[];
  recentBookings: AgentDashboardRow[];
};

const fallbackOverview: AgentDashboardOverview = {
  agent: {
    id: "",
    name: "Agent",
    email: "",
    status: "active",
    commissionPercent: 0,
  },
  summary: {
    totalOffers: 0,
    incomingOffers: 0,
    answeredOffers: 0,
    acceptedOffers: 0,
    declinedOffers: 0,
    bookings: 0,
    tickets: 0,
    vehiclesInTraffic: 0,
    newMessages: 0,
  },
  recentOffers: [],
  recentBookings: [],
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

function amount(row: any) {
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

function mapOffer(row: any): AgentDashboardRow {
  return {
    id: String(pick(row, ["id", "uuid"]) || ""),
    title: String(
      pick(row, [
        "destination",
        "destination_city",
        "final_destination",
        "to",
      ]) || "Offert"
    ),
    subtitle: String(
      pick(row, [
        "customer_name",
        "customerName",
        "Namn_efternamn",
        "contact_person",
        "foretag_forening",
        "customer_email",
      ]) || "Kund saknas"
    ),
    status: String(pick(row, ["status"]) || "inkommen"),
    date: String(
      pick(row, [
        "departure_date",
        "travel_date",
        "date",
        "offer_date",
        "created_at",
        "added_at",
      ]) || ""
    ),
    amount: amount(row),
    raw: row,
  };
}

function mapBooking(row: any): AgentDashboardRow {
  const from = String(
    pick(row, [
      "departure_place",
      "departure",
      "from",
      "pickup_place",
      "start",
    ]) || "Start saknas"
  );

  const to = String(
    pick(row, [
      "destination",
      "destination_city",
      "final_destination",
      "to",
      "dropoff_place",
    ]) || "Destination saknas"
  );

  return {
    id: String(pick(row, ["id", "uuid", "booking_id"]) || ""),
    title: String(
      pick(row, ["booking_number", "bookingNumber", "reference", "id"]) ||
        "Bokning"
    ),
    subtitle: `${from} → ${to}`,
    status: String(pick(row, ["status"]) || "bokad"),
    date: String(
      pick(row, [
        "departure_date",
        "travel_date",
        "date",
        "created_at",
        "added_at",
      ]) || ""
    ),
    amount: amount(row),
    raw: row,
  };
}

export async function getAgentDashboardOverview(): Promise<AgentDashboardOverview> {
  const { data, error } = await supabase.rpc("get_agent_dashboard_overview");

  if (error) {
    console.log("get_agent_dashboard_overview error:", error.message);
    return fallbackOverview;
  }

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  return {
    agent: {
      id: String(raw?.agent?.id || ""),
      name: String(raw?.agent?.name || "Agent"),
      email: String(raw?.agent?.email || ""),
      status: String(raw?.agent?.status || "active"),
      commissionPercent: Number(raw?.agent?.commissionPercent || 0),
    },
    summary: {
      totalOffers: Number(raw?.summary?.totalOffers || 0),
      incomingOffers: Number(raw?.summary?.incomingOffers || 0),
      answeredOffers: Number(raw?.summary?.answeredOffers || 0),
      acceptedOffers: Number(raw?.summary?.acceptedOffers || 0),
      declinedOffers: Number(raw?.summary?.declinedOffers || 0),
      bookings: Number(raw?.summary?.bookings || 0),
      tickets: Number(raw?.summary?.tickets || 0),
      vehiclesInTraffic: Number(raw?.summary?.vehiclesInTraffic || 0),
      newMessages: Number(raw?.summary?.newMessages || 0),
    },
    recentOffers: Array.isArray(raw?.recentOffers)
      ? raw.recentOffers.map(mapOffer)
      : [],
    recentBookings: Array.isArray(raw?.recentBookings)
      ? raw.recentBookings.map(mapBooking)
      : [],
  };
}

export function getFallbackAgentDashboardOverview() {
  return fallbackOverview;
}

export function formatAgentMoney(value: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatAgentDate(value?: string) {
  if (!value) return "";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}
