import { supabase } from "../lib/supabase";

export async function agentCreateOffer(input: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  departure: string;
  destination: string;
  departureDate: string;
  departureTime: string;
  passengers: string;
  notes: string;
  totalPrice?: string;
}) {
  const { data, error } = await supabase.rpc("agent_create_offer", {
    p_payload: input,
  });

  if (error) throw new Error(error.message);

  const raw = typeof data === "string" ? JSON.parse(data) : data;
  if (!raw?.ok) throw new Error(raw?.error || "Kunde inte skapa offert.");

  return raw;
}

export async function agentPrepareOfferSend(input: {
  offerId: string;
  subject: string;
  message: string;
}) {
  const { data, error } = await supabase.rpc("agent_prepare_offer_send", {
    p_offer_id: input.offerId,
    p_subject: input.subject,
    p_message: input.message,
  });

  if (error) throw new Error(error.message);

  const raw = typeof data === "string" ? JSON.parse(data) : data;
  if (!raw?.ok) throw new Error(raw?.error || "Kunde inte förbereda utskick.");

  return raw;
}

export async function agentCreateShuttleBooking(input: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  fromStop: string;
  toStop: string;
  travelDate: string;
  travelTime: string;
  passengers: string;
  ticketType: string;
  totalPrice: string;
}) {
  const { data, error } = await supabase.rpc("agent_create_shuttle_booking", {
    p_payload: input,
  });

  if (error) throw new Error(error.message);

  const raw = typeof data === "string" ? JSON.parse(data) : data;
  if (!raw?.ok) throw new Error(raw?.error || "Kunde inte boka flygbuss.");

  return raw;
}

export async function agentCreateSundraBooking(input: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  tripTitle: string;
  departurePlace: string;
  travelDate: string;
  passengers: string;
  totalPrice: string;
}) {
  const { data, error } = await supabase.rpc("agent_create_sundra_booking", {
    p_payload: input,
  });

  if (error) throw new Error(error.message);

  const raw = typeof data === "string" ? JSON.parse(data) : data;
  if (!raw?.ok) throw new Error(raw?.error || "Kunde inte boka Sundra-resa.");

  return raw;
}

export type AgentLivePosition = {
  id: string;
  vehicleName: string;
  registrationNumber: string;
  driverName: string;
  status: string;
  latitude: number;
  longitude: number;
  speedKmh: number;
  updatedAt: string;
};

export async function getAgentLiveTracking(input?: {
  offerId?: string;
  bookingId?: string;
}) {
  const { data, error } = await supabase.rpc("get_agent_live_tracking", {
    p_offer_id: input?.offerId || null,
    p_booking_id: input?.bookingId || null,
  });

  if (error) throw new Error(error.message);

  const raw = typeof data === "string" ? JSON.parse(data) : data;
  if (!raw?.ok) throw new Error(raw?.error || "Kunde inte hämta livepositioner.");

  return Array.isArray(raw.positions)
    ? raw.positions.map((row: any) => ({
        id: String(row.id || ""),
        vehicleName: String(row.vehicle_name || "Buss"),
        registrationNumber: String(row.registration_number || ""),
        driverName: String(row.driver_name || ""),
        status: String(row.status || "I trafik"),
        latitude: Number(row.latitude || 0),
        longitude: Number(row.longitude || 0),
        speedKmh: Number(row.speed_kmh || 0),
        updatedAt: String(row.updated_at || ""),
      }))
    : [];
}
