import { supabase } from "../lib/supabase";

function parsePickupStops(value: any): string[] {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  if (typeof value === "string") {
    const clean = value.trim();

    if (!clean) return [];

    try {
      const parsed = JSON.parse(clean);

      if (Array.isArray(parsed)) {
        return parsed.map(String).filter(Boolean);
      }
    } catch {
      return clean
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

export type AdminDriver = {
  userId: string;
  email: string;
  displayName: string;
  phone: string;
};

export type AdminDriverOrder = {
  id: string;
  driverUserId: string;
  driverEmail: string;
  title: string;
  customerName: string;
  vehicleLabel: string;
  travelDate: string;
  startTime: string;
  endTime: string;
  pickupPlace: string;
  destination: string;
  passengerCount: number;
  status: string;
  sourceType: string;
  createdAt: string;
};

export type AdminDriverOrderSource = {
  sourceType: "manual" | "offer" | "booking" | "sundra";
  sourceId: string;
  sourceLabel: string;
  title: string;
  lineName: string;
  departureDisplay: string;
  customerName: string;
  contactName: string;
  contactPhone: string;
  travelDate: string;
  startTime: string;
  endTime: string;
  pickupPlace: string;
  destination: string;
  passengerCount: string;
  pickupStops: string[];
  notes: string;
  instructions: string;
};

export async function getAdminDrivers(): Promise<AdminDriver[]> {
  const { data, error } = await supabase.rpc("admin_get_drivers");

  if (error) throw new Error(error.message);

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  if (!raw?.ok) {
    throw new Error(raw?.error || "Kunde inte hämta förare.");
  }

  return Array.isArray(raw.drivers)
    ? raw.drivers.map((row: any) => ({
        userId: String(row.userId || ""),
        email: String(row.email || ""),
        displayName: String(row.displayName || ""),
        phone: String(row.phone || ""),
      }))
    : [];
}

export async function getAdminDriverOrders(): Promise<AdminDriverOrder[]> {
  const { data, error } = await supabase.rpc("admin_get_driver_orders");

  if (error) throw new Error(error.message);

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  if (!raw?.ok) {
    throw new Error(raw?.error || "Kunde inte hämta körorder.");
  }

  return Array.isArray(raw.orders)
    ? raw.orders.map((row: any) => ({
        id: String(row.id || ""),
        driverUserId: String(row.driverUserId || ""),
        driverEmail: String(row.driverEmail || ""),
        title: String(row.title || ""),
        customerName: String(row.customerName || ""),
        vehicleLabel: String(row.vehicleLabel || ""),
        travelDate: String(row.travelDate || ""),
        startTime: String(row.startTime || ""),
        endTime: String(row.endTime || ""),
        pickupPlace: String(row.pickupPlace || ""),
        destination: String(row.destination || ""),
        passengerCount: Number(row.passengerCount || 0),
        status: String(row.status || "planned"),
        sourceType: String(row.sourceType || ""),
        createdAt: String(row.createdAt || ""),
      }))
    : [];
}

export async function getAdminDriverOrderSources(): Promise<AdminDriverOrderSource[]> {
  const { data, error } = await supabase.rpc("admin_get_driver_order_sources");

  if (error) throw new Error(error.message);

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  if (!raw?.ok) {
    throw new Error(raw?.error || "Kunde inte hämta offerter/bokningar/Sundra.");
  }

  return Array.isArray(raw.sources)
    ? raw.sources.map((row: any) => ({
        sourceType: String(row.sourceType || "manual") as "manual" | "offer" | "booking" | "sundra",
        sourceId: String(row.sourceId || ""),
        sourceLabel: String(row.sourceLabel || ""),
        title: String(row.title || ""),
        lineName: String(row.lineName || ""),
        departureDisplay: String(row.departureDisplay || ""),
        customerName: String(row.customerName || ""),
        contactName: String(row.contactName || ""),
        contactPhone: String(row.contactPhone || ""),
        travelDate: String(row.travelDate || ""),
        startTime: String(row.startTime || ""),
        endTime: String(row.endTime || ""),
        pickupPlace: String(row.pickupPlace || ""),
        destination: String(row.destination || ""),
        passengerCount: String(row.passengerCount || "0"),
        pickupStops: parsePickupStops(row.pickupStops),
        notes: String(row.notes || ""),
        instructions: String(row.instructions || ""),
      }))
    : [];
}

export async function createAdminDriverOrder(input: {
  driverUserId: string;
  driverEmail: string;
  title: string;
  customerName: string;
  vehicleLabel: string;
  travelDate: string;
  startTime: string;
  endTime: string;
  pickupPlace: string;
  destination: string;
  passengerCount: number;
  contactName: string;
  contactPhone: string;
  pickupStops: string[];
  instructions: string;
  notes: string;
  sourceType?: string;
  sourceId?: string;
}) {
  const { data, error } = await supabase.rpc("admin_create_driver_order", {
    p_driver_user_id: input.driverUserId || null,
    p_driver_email: input.driverEmail || null,
    p_payload: {
      title: input.title,
      customerName: input.customerName,
      vehicleLabel: input.vehicleLabel,
      travelDate: input.travelDate,
      startTime: input.startTime,
      endTime: input.endTime,
      pickupPlace: input.pickupPlace,
      destination: input.destination,
      passengerCount: input.passengerCount,
      status: "request",
      contactName: input.contactName,
      contactPhone: input.contactPhone,
      pickupStops: input.pickupStops,
      instructions: input.instructions,
      notes: input.notes,
      sourceType: input.sourceType || "charter",
      sourceId: input.sourceId || "",
    },
  });

  if (error) throw new Error(error.message);

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  if (!raw?.ok) {
    throw new Error(raw?.error || "Kunde inte skapa körorder.");
  }

  return raw;
}

export function getAdminDriverOrderStatusLabel(status: string) {
  if (status === "request") return "Förfrågan";
  if (status === "planned") return "Planerad";
  if (status === "confirmed") return "Bekräftad";
  if (status === "started") return "Påbörjad";
  if (status === "completed") return "Slutförd";
  if (status === "cancelled") return "Avbruten";

  return "Okänd";
}


export async function deleteAdminDriverOrder(orderId: string) {
  const { data, error } = await supabase.rpc("admin_delete_driver_order", {
    p_order_id: orderId,
  });

  if (error) throw new Error(error.message);

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  if (!raw?.ok) {
    throw new Error(raw?.error || "Kunde inte ta bort körordern.");
  }

  return raw;
}
