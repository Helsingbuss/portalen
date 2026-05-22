import { supabase } from "../lib/supabase";
import type { AdminBookingFeedItem, BookingFilterKey } from "../types/bookings";

function toNumber(value: unknown): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

export async function getAdminBookingFeed(
  filter: BookingFilterKey,
  searchQuery: string
): Promise<AdminBookingFeedItem[]> {
  const { data, error } = await supabase.rpc("get_admin_booking_feed", {
    search_query: searchQuery,
    filter_key: filter,
  });

  if (error) {
    console.log("Booking feed error:", error);
    throw new Error(error.message);
  }

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map((item: any) => ({
    id: String(item.id || ""),
    kind: String(item.kind || "booking"),
    sourceLabel: item.sourceLabel ? String(item.sourceLabel) : "",
    title: String(item.title || "Bokning"),
    reference: String(item.reference || ""),
    customer: String(item.customer || "Okänd kund"),
    date: String(item.date || ""),
    startTime: item.startTime ? String(item.startTime) : "",
    endTime: item.endTime ? String(item.endTime) : "",
    passengers: toNumber(item.passengers),
    status: String(item.status || "Öppen"),
    statusKey: String(item.statusKey || "open"),
    isArchived: Boolean(item.isArchived),
    departurePlace: item.departurePlace ? String(item.departurePlace) : "",
    destination: item.destination ? String(item.destination) : "",
  }));
}
