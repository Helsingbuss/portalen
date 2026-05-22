import { supabase } from "../lib/supabase";

export type AgentBookingType = "sundra" | "shuttle";

export type AgentBookingListItem = {
  id: string;
  type: AgentBookingType;
  title: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  travelDate: string;
  travelTime: string;
  pickupPlace: string;
  routeText: string;
  passengers: number;
  seatNumbers: string[];
  totalPrice: number;
  paymentStatus: string;
  paymentUrl: string;
  status: string;
  createdAt: string;
};

export type AgentBookingDetail = Record<string, any>;

export async function getAgentBookingsOverview(): Promise<AgentBookingListItem[]> {
  const { data, error } = await supabase.rpc("get_agent_bookings_overview");

  if (error) throw new Error(error.message);

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  if (!raw?.ok) {
    throw new Error(raw?.error || "Kunde inte hämta bokningar.");
  }

  return Array.isArray(raw.bookings)
    ? raw.bookings.map((row: any) => ({
        id: String(row.id || ""),
        type: String(row.type || "sundra") as AgentBookingType,
        title: String(row.title || ""),
        customerName: String(row.customerName || ""),
        customerEmail: String(row.customerEmail || ""),
        customerPhone: String(row.customerPhone || ""),
        travelDate: String(row.travelDate || ""),
        travelTime: String(row.travelTime || ""),
        pickupPlace: String(row.pickupPlace || ""),
        routeText: String(row.routeText || ""),
        passengers: Number(row.passengers || 0),
        seatNumbers: Array.isArray(row.seatNumbers) ? row.seatNumbers.map(String) : [],
        totalPrice: Number(row.totalPrice || 0),
        paymentStatus: String(row.paymentStatus || "pending"),
        paymentUrl: String(row.paymentUrl || ""),
        status: String(row.status || ""),
        createdAt: String(row.createdAt || ""),
      }))
    : [];
}

export async function getAgentBookingDetail(input: {
  type: AgentBookingType;
  id: string;
}): Promise<AgentBookingDetail> {
  const { data, error } = await supabase.rpc("get_agent_booking_detail", {
    p_booking_type: input.type,
    p_booking_id: input.id,
  });

  if (error) throw new Error(error.message);

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  if (!raw?.ok) {
    throw new Error(raw?.error || "Kunde inte hämta bokningen.");
  }

  return raw.booking || {};
}

export function formatAgentBookingMoney(value: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function getPaymentStatusLabel(status: string) {
  const value = String(status || "").toLowerCase();

  if (value === "paid" || value === "betald") return "Betald";
  if (value === "pending" || value === "created") return "Väntar på betalning";
  if (value === "failed") return "Misslyckad";
  if (value === "refunded") return "Återbetald";
  if (value === "cancelled" || value === "canceled") return "Avbruten";

  return status || "Väntar";
}

export async function saveAgentBookingPaymentInfo(input: {
  type: AgentBookingType;
  id: string;
  paymentUrl: string;
  paymentReference?: string;
  paymentStatus?: string;
  paymentProvider?: string;
}) {
  const { data, error } = await supabase.rpc("update_agent_booking_payment_info", {
    p_booking_type: input.type,
    p_booking_id: input.id,
    p_payload: {
      paymentUrl: input.paymentUrl,
      paymentReference: input.paymentReference || "",
      paymentStatus: input.paymentStatus || "pending",
      paymentProvider: input.paymentProvider || "sumup",
    },
  });

  if (error) throw new Error(error.message);

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  if (!raw?.ok) {
    throw new Error(raw?.error || "Kunde inte spara betalningsinformation.");
  }

  return raw;
}