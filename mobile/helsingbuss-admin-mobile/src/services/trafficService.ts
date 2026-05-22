import { supabase } from "../lib/supabase";
import type { AdminTrafficOverview } from "../types/traffic";

function toNumber(value: unknown): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

const fallbackTraffic: AdminTrafficOverview = {
  summary: {
    departuresToday: 0,
    delayedToday: 0,
    cancelledToday: 0,
  },
  departures: [],
  liveVehicles: [],
  quickStatus: [
    {
      type: "ok",
      text: "Ingen driftdata hämtad ännu.",
      time: "",
    },
  ],
};

export async function getAdminTrafficOverview(): Promise<AdminTrafficOverview> {
  const { data, error } = await supabase.rpc("get_admin_traffic_overview");

  if (error) {
    console.log("Traffic overview error:", error);
    throw new Error(error.message);
  }

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  if (!raw) return fallbackTraffic;

  return {
    summary: {
      departuresToday: toNumber(raw?.summary?.departuresToday),
      delayedToday: toNumber(raw?.summary?.delayedToday),
      cancelledToday: toNumber(raw?.summary?.cancelledToday),
    },
    departures: Array.isArray(raw?.departures)
      ? raw.departures.map((item: any) => ({
          id: String(item.id || ""),
          kind: String(item.kind || "departure"),
          sourceLabel: String(item.sourceLabel || "AVGÅNG"),
          time: String(item.time || ""),
          endTime: item.endTime ? String(item.endTime) : "",
          title: String(item.title || "Avgång"),
          route: String(item.route || "Rutt saknas"),
          driver: String(item.driver || "Ej tilldelad"),
          vehicle: String(item.vehicle || "Ej tilldelad"),
          status: String(item.status || "I tid"),
          statusKey: String(item.statusKey || "ok"),
          delayMinutes: toNumber(item.delayMinutes),
        }))
      : [],
    liveVehicles: Array.isArray(raw?.liveVehicles)
      ? raw.liveVehicles.map((item: any) => ({
          id: String(item.id || ""),
          vehicleName: String(item.vehicleName || "Buss"),
          driverName: String(item.driverName || "Ej angiven"),
          title: String(item.title || "Aktiv körning"),
          route: String(item.route || ""),
          status: String(item.status || "active"),
          delayMinutes: toNumber(item.delayMinutes),
          lat: item.lat !== null && item.lat !== undefined ? toNumber(item.lat) : undefined,
          lng: item.lng !== null && item.lng !== undefined ? toNumber(item.lng) : undefined,
          speedKmh: item.speedKmh !== null && item.speedKmh !== undefined ? toNumber(item.speedKmh) : undefined,
          heading: item.heading !== null && item.heading !== undefined ? toNumber(item.heading) : undefined,
          lastSeenAt: item.lastSeenAt ? String(item.lastSeenAt) : "",
        }))
      : [],
    quickStatus: Array.isArray(raw?.quickStatus)
      ? raw.quickStatus.map((item: any) => ({
          type: String(item.type || "ok"),
          text: String(item.text || ""),
          time: String(item.time || ""),
        }))
      : fallbackTraffic.quickStatus,
  };
}

export function getFallbackTrafficOverview() {
  return fallbackTraffic;
}
