import { supabase } from "../lib/supabase";

export type DriverOrderPassenger = {
  id: string;
  orderId: string;
  passengerName: string;
  ticketCode: string;
  seatNumber: string;
  pickupPlace: string;
  ticketType: string;
  checkedIn: boolean;
  checkedInAt: string;
  createdAt: string;
};

export async function getMyDriverOrderPassengers(orderId: string): Promise<DriverOrderPassenger[]> {
  const { data, error } = await supabase.rpc("get_my_driver_order_passengers", {
    p_order_id: orderId,
  });

  if (error) throw new Error(error.message);

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  if (!raw?.ok) {
    throw new Error(raw?.error || "Kunde inte hämta resenärer.");
  }

  return Array.isArray(raw.passengers)
    ? raw.passengers.map((row: any) => ({
        id: String(row.id || ""),
        orderId: String(row.orderId || ""),
        passengerName: String(row.passengerName || ""),
        ticketCode: String(row.ticketCode || ""),
        seatNumber: String(row.seatNumber || ""),
        pickupPlace: String(row.pickupPlace || ""),
        ticketType: String(row.ticketType || ""),
        checkedIn: Boolean(row.checkedIn),
        checkedInAt: String(row.checkedInAt || ""),
        createdAt: String(row.createdAt || ""),
      }))
    : [];
}

export async function checkInDriverOrderPassenger(input: {
  orderId: string;
  passengerId?: string;
  ticketCode?: string;
}) {
  const { data, error } = await supabase.rpc("check_in_my_driver_order_passenger", {
    p_order_id: input.orderId,
    p_passenger_id: input.passengerId || null,
    p_ticket_code: input.ticketCode || null,
  });

  if (error) throw new Error(error.message);

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  if (!raw?.ok) {
    throw new Error(raw?.error || "Kunde inte checka in resenären.");
  }

  return raw;
}
