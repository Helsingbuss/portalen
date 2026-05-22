import * as Location from "expo-location";
import { supabase } from "../lib/supabase";

export type DriverLocationPayload = {
  sourceKind: string;
  sourceId: string;
  vehicleName: string;
  driverName: string;
  title: string;
  routeText: string;
  lat: number;
  lng: number;
  speedKmh?: number | null;
  heading?: number | null;
  status?: string;
  delayMinutes?: number;
};

export async function requestDriverLocationPermission() {
  const permission = await Location.requestForegroundPermissionsAsync();

  return permission.status === "granted";
}

export async function sendDriverLiveLocation(payload: DriverLocationPayload) {
  const { data, error } = await supabase.rpc("upsert_driver_live_location", {
    p_source_kind: payload.sourceKind,
    p_source_id: payload.sourceId,
    p_vehicle_name: payload.vehicleName,
    p_driver_name: payload.driverName,
    p_title: payload.title,
    p_route_text: payload.routeText,
    p_lat: payload.lat,
    p_lng: payload.lng,
    p_speed_kmh: payload.speedKmh ?? null,
    p_heading: payload.heading ?? null,
    p_status: payload.status ?? "active",
    p_delay_minutes: payload.delayMinutes ?? 0,
  });

  if (error) {
    console.log("Send driver live location error:", error);
    throw new Error(error.message);
  }

  return data;
}

export async function stopDriverLiveLocation(sourceKind: string, sourceId: string) {
  const { data, error } = await supabase.rpc("stop_driver_live_location", {
    p_source_kind: sourceKind,
    p_source_id: sourceId,
  });

  if (error) {
    console.log("Stop driver live location error:", error);
    throw new Error(error.message);
  }

  return data;
}

export function watchDriverPosition(
  onLocation: (location: Location.LocationObject) => void,
  onError?: (error: unknown) => void
) {
  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 8000,
      distanceInterval: 20,
    },
    onLocation,
    onError
  );
}
