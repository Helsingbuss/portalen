import { supabase } from "../lib/supabase";
import type { AdminDashboardSummary } from "../types/dashboard";

const fallbackDashboard: AdminDashboardSummary = {
  todayBookings: 0,
  todayBookingsDiff: 0,
  activeOffers: 0,
  activeOffersDiff: 0,
  upcomingDepartures: 0,
  unreadMessages: 0,
  trafficStatus: "Laddar trafikläge",
  trafficText: "Vi hämtar senaste informationen från Helsingbuss Portal.",
  weekBookings: [
    { day: "Mån", count: 0 },
    { day: "Tis", count: 0 },
    { day: "Ons", count: 0 },
    { day: "Tor", count: 0 },
    { day: "Fre", count: 0 },
    { day: "Lör", count: 0 },
    { day: "Sön", count: 0 },
  ],
  recentActivity: [],
};

function toNumber(value: unknown): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const { data, error } = await supabase.rpc("get_admin_dashboard_summary");

  if (error) {
    console.log("Dashboard summary error:", error);
    throw new Error(error.message);
  }

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  return {
    todayBookings: toNumber(raw?.todayBookings),
    todayBookingsDiff: toNumber(raw?.todayBookingsDiff),

    activeOffers: toNumber(raw?.activeOffers),
    activeOffersDiff: toNumber(raw?.activeOffersDiff),

    upcomingDepartures: toNumber(raw?.upcomingDepartures),
    unreadMessages: toNumber(raw?.unreadMessages),

    trafficStatus: raw?.trafficStatus || fallbackDashboard.trafficStatus,
    trafficText: raw?.trafficText || fallbackDashboard.trafficText,

    weekBookings: Array.isArray(raw?.weekBookings)
      ? raw.weekBookings.map((item: any) => ({
          day: String(item.day || ""),
          date: item.date ? String(item.date) : undefined,
          count: toNumber(item.count),
        }))
      : fallbackDashboard.weekBookings,

    recentActivity: Array.isArray(raw?.recentActivity)
      ? raw.recentActivity.map((item: any) => ({
          type: String(item.type || "activity"),
          title: String(item.title || "Händelse"),
          reference: item.reference ? String(item.reference) : undefined,
          customer: item.customer ? String(item.customer) : undefined,
          description: item.description ? String(item.description) : undefined,
          time: item.time ? String(item.time) : undefined,
          created_at: item.created_at ? String(item.created_at) : undefined,
        }))
      : [],
  };
}

export function getFallbackDashboardSummary() {
  return fallbackDashboard;
}
