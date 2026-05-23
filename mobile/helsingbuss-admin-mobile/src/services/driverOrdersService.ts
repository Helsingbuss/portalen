import { supabase } from "../lib/supabase";

export type DriverOrderStatus =
  | "request"
  | "planned"
  | "confirmed"
  | "started"
  | "completed"
  | "cancelled";

export type DriverOrder = {
  id: string;
  title: string;
  customerName: string;
  vehicleLabel: string;
  travelDate: string;
  startTime: string;
  endTime: string;
  pickupPlace: string;
  destination: string;
  passengerCount: number;
  status: DriverOrderStatus;
  contactName: string;
  contactPhone: string;
  pickupStops: string[];
  instructions: string;
  notes: string;
  sourceType: string;
  sourceId: string;
  createdAt: string;
};

export async function getMyDriverOrders(): Promise<DriverOrder[]> {
  const { data, error } = await supabase.rpc("get_my_driver_orders");

  if (error) throw new Error(error.message);

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  if (!raw?.ok) {
    throw new Error(raw?.error || "Kunde inte hämta körningar.");
  }

  return Array.isArray(raw.orders)
    ? raw.orders.map((row: any) => ({
        id: String(row.id || ""),
        title: String(row.title || "Körning"),
        customerName: String(row.customerName || ""),
        vehicleLabel: String(row.vehicleLabel || ""),
        travelDate: String(row.travelDate || ""),
        startTime: String(row.startTime || ""),
        endTime: String(row.endTime || ""),
        pickupPlace: String(row.pickupPlace || ""),
        destination: String(row.destination || ""),
        passengerCount: Number(row.passengerCount || 0),
        status: String(row.status || "planned") as DriverOrderStatus,
        contactName: String(row.contactName || ""),
        contactPhone: String(row.contactPhone || ""),
        pickupStops: Array.isArray(row.pickupStops) ? row.pickupStops.map(String) : [],
        instructions: String(row.instructions || ""),
        notes: String(row.notes || ""),
        sourceType: String(row.sourceType || ""),
        sourceId: String(row.sourceId || ""),
        createdAt: String(row.createdAt || ""),
      }))
    : [];
}

export async function updateMyDriverOrderStatus(input: {
  orderId: string;
  status: DriverOrderStatus;
}) {
  const { data, error } = await supabase.rpc("update_my_driver_order_status", {
    p_order_id: input.orderId,
    p_status: input.status,
  });

  if (error) throw new Error(error.message);

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  if (!raw?.ok) {
    throw new Error(raw?.error || "Kunde inte uppdatera körningen.");
  }

  return raw;
}

export function getDriverStatusLabel(status: string) {
  if (status === "confirmed") return "Bekräftad";
  if (status === "request") return "Förfrågan";
  if (status === "planned") return "Planerad";
  if (status === "started") return "Påbörjad";
  if (status === "completed") return "Slutförd";
  if (status === "cancelled") return "Avbruten";

  return "Okänd";
}

export function formatDriverDate(value: string) {
  if (!value) return "Datum saknas";

  const date = new Date(value + "T12:00:00");

  return new Intl.DateTimeFormat("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function isTodayDriverOrder(value: string) {
  if (!value) return false;

  const today = new Date();
  const date = new Date(value + "T12:00:00");

  return (
    today.getFullYear() === date.getFullYear() &&
    today.getMonth() === date.getMonth() &&
    today.getDate() === date.getDate()
  );
}
