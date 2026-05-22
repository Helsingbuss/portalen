import { supabase } from "../lib/supabase";
import type { FleetOverview } from "../types/fleet";

const emptyFleet: FleetOverview = {
  vehicles: [],
  drivers: [],
  documents: {
    inspectionIssues: 0,
    serviceSoon: 0,
    insuranceOk: true,
    checklistsTodo: 0,
  },
};

function normalizeVehicleStatus(status: string) {
  const clean = String(status || "").toLowerCase();

  if (["available", "tillgänglig", "tillganglig"].includes(clean)) return "available";
  if (["service_soon", "service snart", "service"].includes(clean)) return "service_soon";
  if (["in_traffic", "i trafik", "traffic"].includes(clean)) return "in_traffic";
  if (["inactive", "inaktiv"].includes(clean)) return "inactive";

  return clean || "available";
}

function normalizeDriverStatus(status: string) {
  const clean = String(status || "").toLowerCase();

  if (["available", "tillgänglig", "tillganglig"].includes(clean)) return "available";
  if (["in_traffic", "i trafik", "traffic"].includes(clean)) return "in_traffic";
  if (["inactive", "inaktiv"].includes(clean)) return "inactive";

  return clean || "available";
}

export async function getFleetOverview(): Promise<FleetOverview> {
  try {
    const { data, error } = await supabase.rpc("get_admin_fleet_overview");

    if (error) {
      console.log("Fleet overview error:", error);
      return emptyFleet;
    }

    const raw = typeof data === "string" ? JSON.parse(data) : data;

    const vehicles = Array.isArray(raw?.vehicles)
      ? raw.vehicles.map((item: any) => ({
          id: String(item.id || item.name || ""),
          name: String(item.name || "Fordon"),
          model: String(item.model || ""),
          registration: item.registration ? String(item.registration) : "",
          km: String(item.km || "0"),
          nextService: String(item.nextService || ""),
          status: normalizeVehicleStatus(item.status),
        }))
      : [];

    const drivers = Array.isArray(raw?.drivers)
      ? raw.drivers.map((item: any) => ({
          id: String(item.id || item.name || ""),
          name: String(item.name || "Chaufför"),
          assignment: String(item.assignment || "Tillgänglig"),
          phone: item.phone ? String(item.phone) : "",
          status: normalizeDriverStatus(item.status),
        }))
      : [];

    return {
      vehicles,
      drivers,
      documents: raw?.documents || emptyFleet.documents,
    };
  } catch (error) {
    console.log("Fleet overview catch:", error);
    return emptyFleet;
  }
}

export function getFallbackFleetOverview() {
  return emptyFleet;
}
