import { supabase } from "../lib/supabase";

export type AgentBookingItem = {
  id: string;
  reference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  departure: string;
  destination: string;
  departureDate: string;
  departureTime: string;
  status: string;
  passengers: number;
  amount: number;
  raw: any;
};

export type AgentBookingsOverview = {
  summary: {
    total: number;
    upcoming: number;
    confirmed: number;
    completed: number;
    cancelled: number;
  };
  bookings: AgentBookingItem[];
};

const fallback: AgentBookingsOverview = {
  summary: {
    total: 0,
    upcoming: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
  },
  bookings: [],
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

export async function getAgentBookingsOverview(): Promise<AgentBookingsOverview> {
  const { data, error } = await supabase.rpc("get_agent_bookings_overview");

  if (error) {
    console.log("get_agent_bookings_overview error:", error.message);
    return fallback;
  }

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  return {
    summary: {
      total: Number(raw?.summary?.total || 0),
      upcoming: Number(raw?.summary?.upcoming || 0),
      confirmed: Number(raw?.summary?.confirmed || 0),
      completed: Number(raw?.summary?.completed || 0),
      cancelled: Number(raw?.summary?.cancelled || 0),
    },
    bookings: Array.isArray(raw?.bookings)
      ? raw.bookings.map((row: any) => ({
          id: String(pick(row, ["id", "uuid", "booking_id"]) || ""),
          reference: String(
            pick(row, [
              "booking_number",
              "bookingNumber",
              "reference",
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
              "pickup_place",
            ]) || ""
          ),
          destination: String(
            pick(row, [
              "destination",
              "destination_city",
              "final_destination",
              "to",
              "dropoff_place",
            ]) || ""
          ),
          departureDate: String(
            pick(row, [
              "departure_date",
              "travel_date",
              "date",
              "created_at",
              "added_at",
            ]) || ""
          ),
          departureTime: String(
            pick(row, [
              "departure_time",
              "time",
              "pickup_time",
            ]) || ""
          ),
          status: String(pick(row, ["status"]) || "bokad"),
          passengers: Number(pick(row, ["passengers", "pax", "antal_resenarer"]) || 0),
          amount: getAmount(row),
          raw: row,
        }))
      : [],
  };
}

export function formatAgentBookingMoney(value: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatAgentBookingDate(value?: string) {
  if (!value) return "";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export function getAgentBookingStatusLabel(status: string) {
  const clean = String(status || "").toLowerCase();

  if (["bekräftad", "bekraftad", "confirmed", "bokad", "booked", "active"].includes(clean)) return "Bekräftad";
  if (["slutförd", "slutford", "completed", "done", "finished"].includes(clean)) return "Slutförd";
  if (["avbokad", "cancelled", "canceled", "avbruten"].includes(clean)) return "Avbokad";

  return status || "Bokad";
}
