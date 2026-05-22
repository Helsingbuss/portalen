import { supabase } from "../lib/supabase";

export type AgentBookingPerson = {
  id: string;
  name: string;
  email: string;
  phone: string;
  category: string;
  seat: string;
  ticketNumber: string;
  status: string;
  raw: any;
};

export type AgentLiveVehicle = {
  id: string;
  vehicleName: string;
  registrationNumber: string;
  driverName: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  updatedAt: string;
  raw: any;
};

export type AgentBookingDetail = {
  id: string;
  reference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  departure: string;
  destination: string;
  departureDate: string;
  departureTime: string;
  returnDate: string;
  returnTime: string;
  status: string;
  passengersCount: number;
  amount: number;
  notes: string;
  tickets: AgentBookingPerson[];
  passengers: AgentBookingPerson[];
  liveVehicle: AgentLiveVehicle | null;
  raw: any;
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

function mapPerson(row: any): AgentBookingPerson {
  return {
    id: String(pick(row, ["id", "uuid", "ticket_id", "passenger_id"]) || ""),
    name: String(
      pick(row, [
        "name",
        "full_name",
        "passenger_name",
        "customer_name",
        "Namn_efternamn",
      ]) || "Namn saknas"
    ),
    email: String(pick(row, ["email", "customer_email", "passenger_email"]) || ""),
    phone: String(pick(row, ["phone", "customer_phone", "passenger_phone"]) || ""),
    category: String(
      pick(row, [
        "category",
        "ticket_category",
        "passenger_category",
        "ticket_type",
        "type",
      ]) || ""
    ),
    seat: String(pick(row, ["seat", "seat_number", "seat_label", "place"]) || ""),
    ticketNumber: String(
      pick(row, [
        "ticket_number",
        "ticketNumber",
        "qr_code",
        "qrCode",
        "reference",
      ]) || ""
    ),
    status: String(pick(row, ["status"]) || ""),
    raw: row,
  };
}

function mapLiveVehicle(row: any): AgentLiveVehicle | null {
  if (!row || Object.keys(row).length === 0) return null;

  const lat = pick(row, ["latitude", "lat"]);
  const lng = pick(row, ["longitude", "lng", "lon"]);

  return {
    id: String(pick(row, ["id", "vehicle_id", "bus_id"]) || ""),
    vehicleName: String(
      pick(row, ["vehicle_name", "vehicleName", "bus_name", "name"]) || "Buss"
    ),
    registrationNumber: String(
      pick(row, ["registration_number", "registrationNumber", "reg_number", "plate"]) || ""
    ),
    driverName: String(
      pick(row, ["driver_name", "driverName", "chauffor_name", "chauffeur_name"]) || ""
    ),
    status: String(pick(row, ["status", "trip_status"]) || "Live"),
    latitude: lat ? Number(lat) : null,
    longitude: lng ? Number(lng) : null,
    updatedAt: String(pick(row, ["updated_at", "last_seen_at", "created_at"]) || ""),
    raw: row,
  };
}

export function mapAgentBookingDetail(
  row: any,
  tickets: any[] = [],
  passengers: any[] = [],
  liveVehicle: any = {}
): AgentBookingDetail {
  const mappedTickets = Array.isArray(tickets) ? tickets.map(mapPerson) : [];
  const mappedPassengers = Array.isArray(passengers) ? passengers.map(mapPerson) : [];

  return {
    id: String(pick(row, ["id", "uuid", "booking_id"]) || ""),
    reference: String(
      pick(row, ["booking_number", "bookingNumber", "reference", "id"]) || ""
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
      pick(row, ["departure_date", "travel_date", "date", "created_at"]) || ""
    ),
    departureTime: String(
      pick(row, ["departure_time", "time", "pickup_time"]) || ""
    ),
    returnDate: String(pick(row, ["return_date"]) || ""),
    returnTime: String(pick(row, ["return_time"]) || ""),
    status: String(pick(row, ["status"]) || "bokad"),
    passengersCount: Number(
      pick(row, ["passengers", "pax", "antal_resenarer"]) ||
        mappedPassengers.length ||
        mappedTickets.length ||
        0
    ),
    amount: getAmount(row),
    notes: String(pick(row, ["notes", "comment", "internal_notes"]) || ""),
    tickets: mappedTickets,
    passengers: mappedPassengers,
    liveVehicle: mapLiveVehicle(liveVehicle),
    raw: row,
  };
}

export async function getAgentBookingDetail(id: string): Promise<AgentBookingDetail | null> {
  const { data, error } = await supabase.rpc("get_agent_booking_detail", {
    p_booking_id: id,
  });

  if (error) {
    console.log("get_agent_booking_detail error:", error.message);
    return null;
  }

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  if (!raw?.ok) {
    console.log("get_agent_booking_detail response:", raw?.error);
    return null;
  }

  return mapAgentBookingDetail(
    raw.booking,
    raw.tickets || [],
    raw.passengers || [],
    raw.liveVehicle || {}
  );
}

export function formatAgentBookingDetailMoney(value: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatAgentBookingDetailDate(value?: string) {
  if (!value) return "Ej angivet";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}
