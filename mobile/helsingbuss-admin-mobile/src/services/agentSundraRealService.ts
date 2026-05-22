import { supabase } from "../lib/supabase";

export type AgentSundraTrip = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  raw: any;
};

export type AgentSundraDeparture = {
  id: string;
  tripId: string;
  title: string;
  departureDate: string;
  departureTime: string;
  departurePlace: string;
  price: number;
  capacity: number;
  raw: any;
};

export type AgentSundraPickupPlace = {
  id: string;
  label: string;
  address: string;
  time: string;
  raw: any;
};

export type AgentSundraSeat = {
  seatLabel: string;
  isOccupied: boolean;
  seatPrice: number;
  seatType: string;
  isPremium: boolean;
  sortOrder?: number;
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

export async function getAgentSundraTrips(): Promise<AgentSundraTrip[]> {
  const { data, error } = await supabase.rpc("get_agent_sundra_trips");

  if (error) {
    console.log("get_agent_sundra_trips error:", error.message);
    return [];
  }

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  return Array.isArray(raw?.trips)
    ? raw.trips.map((row: any) => ({
        id: String(pick(row, ["id", "uuid", "trip_id"]) || ""),
        title: String(pick(row, ["title", "name", "trip_title"]) || "Sundra resa"),
        description: String(pick(row, ["description", "short_description", "summary", "ingress"]) || ""),
        imageUrl: String(
          pick(row, [
            "image_url",
            "imageUrl",
            "cover_image",
            "coverImage",
            "main_image",
            "thumbnail",
            "hero_image",
          ]) || ""
        ),
        raw: row,
      }))
    : [];
}

export async function getAgentSundraDepartures(tripId: string): Promise<AgentSundraDeparture[]> {
  const { data, error } = await supabase.rpc("get_agent_sundra_departures", {
    p_trip_id: tripId,
  });

  if (error) {
    console.log("get_agent_sundra_departures error:", error.message);
    return [];
  }

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  return Array.isArray(raw?.departures)
    ? raw.departures.map((row: any) => ({
        id: String(pick(row, ["id", "uuid", "departure_id"]) || ""),
        tripId: String(pick(row, ["trip_id", "sundra_trip_id", "trip_uuid", "tripId"]) || tripId),
        title: String(pick(row, ["title", "name", "departure_title"]) || "Avgång"),
        departureDate: String(pick(row, ["departure_date", "travel_date", "date"]) || ""),
        departureTime: String(pick(row, ["departure_time", "time", "start_time"]) || ""),
        departurePlace: String(pick(row, ["departure_place", "departure", "from_stop", "start_place"]) || ""),
        price: Number(pick(row, ["price", "adult_price", "price_amount", "ticket_price", "total_price"]) || 0),
        capacity: Number(pick(row, ["capacity", "seats", "total_seats"]) || 50),
        raw: row,
      }))
    : [];
}

export async function getAgentSundraPickupPlaces(
  tripId: string,
  departureId: string
): Promise<AgentSundraPickupPlace[]> {
  const { data, error } = await supabase.rpc("get_agent_sundra_pickup_places", {
    p_trip_id: tripId,
    p_departure_id: departureId,
  });

  if (error) {
    console.log("get_agent_sundra_pickup_places error:", error.message);
    return [];
  }

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  return Array.isArray(raw?.pickups)
    ? raw.pickups.map((row: any) => ({
        id: String(pick(row, ["id", "uuid", "stop_id"]) || ""),
        label: String(
          pick(row, [
            "label",
            "name",
            "stop_name",
            "stopName",
            "title",
            "place",
            "pickup_place",
            "departure_place",
            "city",
            "station",
            "address",
          ]) || "Upphämtningsplats"
        ),
        address: String(pick(row, ["address", "street", "full_address"]) || ""),
        time: String(pick(row, ["pickup_time", "departure_time", "time", "stop_time", "scheduled_time"]) || ""),
        raw: row,
      }))
    : [];
}

export async function getAgentSundraSeats(departureId: string): Promise<{
  capacity: number;
  occupied: number;
  available: number;
  seats: AgentSundraSeat[];
}> {
  const { data, error } = await supabase.rpc("get_agent_sundra_seats", {
    p_departure_id: departureId,
  });

  if (error) {
    console.log("get_agent_sundra_seats error:", error.message);
    return { capacity: 0, occupied: 0, available: 0, seats: [] };
  }

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  return {
    capacity: Number(raw?.capacity || 0),
    occupied: Number(raw?.occupied || 0),
    available: Number(raw?.available || 0),
    seats: Array.isArray(raw?.seats)
      ? raw.seats.map((row: any) => ({
          seatLabel: String(row.seatLabel || ""),
          isOccupied: Boolean(row.isOccupied),
          seatPrice: Number(row.seatPrice || 0),
          seatType: String(row.seatType || "Standard"),
          isPremium: Boolean(row.isPremium),
          sortOrder: Number(row.sortOrder || 0),
        }))
      : [],
  };
}

export async function createAgentRealSundraBooking(input: {
  tripId: string;
  departureId: string;
  tripTitle: string;
  departurePlace: string;
  pickupPlace: string;
  travelDate: string;
  travelTime: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  seatNumbers: string[];
  passengers: number;
  pricePerPerson: number;
  ticketTotalPrice: number;
  seatSelectionPrice: number;
  totalPrice: number;
}) {
  const { data, error } = await supabase.rpc("agent_create_sundra_booking_real", {
    p_payload: input,
  });

  if (error) throw new Error(error.message);

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  if (!raw?.ok) {
    throw new Error(raw?.error || "Kunde inte boka Sundra-resa.");
  }

  return raw;
}

export function formatSundraMoney(value: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}



