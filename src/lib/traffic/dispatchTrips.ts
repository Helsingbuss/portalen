// src/lib/traffic/dispatchTrips.ts

export type DispatchSourceType = "helsingbuss" | "sundra" | "flygbuss";

export type DispatchTripStatus =
  | "planned"
  | "active"
  | "delayed"
  | "needs_driver"
  | "needs_vehicle"
  | "partner_pending"
  | "completed"
  | "cancelled";

export type DispatchTrip = {
  id: string;
  sourceType: DispatchSourceType;
  sourceLabel: string;
  sourceId: string | null;
  time: string | null;
  date: string | null;
  title: string;
  route: string;
  from?: string | null;
  to?: string | null;
  driver: string;
  vehicle: string;
  status: string;
  statusCode: DispatchTripStatus;
  passengers: number | null;
};

export const dispatchSourceLabels: Record<DispatchSourceType, string> = {
  helsingbuss: "Helsingbuss",
  sundra: "Sundra",
  flygbuss: "Flygbuss",
};

export function getDispatchSourceClasses(sourceType: DispatchSourceType) {
  switch (sourceType) {
    case "helsingbuss":
      return "bg-slate-950 text-white";
    case "sundra":
      return "bg-rose-50 text-rose-700 ring-1 ring-rose-100";
    case "flygbuss":
      return "bg-teal-50 text-teal-700 ring-1 ring-teal-100";
    default:
      return "bg-slate-50 text-slate-600 ring-1 ring-slate-100";
  }
}

export function getDispatchStatusClasses(status: DispatchTripStatus) {
  switch (status) {
    case "active":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
    case "planned":
      return "bg-sky-50 text-sky-700 ring-1 ring-sky-100";
    case "delayed":
      return "bg-orange-50 text-orange-700 ring-1 ring-orange-100";
    case "needs_driver":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";
    case "needs_vehicle":
      return "bg-orange-50 text-orange-700 ring-1 ring-orange-100";
    case "partner_pending":
      return "bg-purple-50 text-purple-700 ring-1 ring-purple-100";
    case "completed":
      return "bg-slate-50 text-slate-600 ring-1 ring-slate-100";
    case "cancelled":
      return "bg-rose-50 text-rose-700 ring-1 ring-rose-100";
    default:
      return "bg-slate-50 text-slate-600 ring-1 ring-slate-100";
  }
}

export function getDispatchTripsForDate() {
  return [];
}

export function getDispatchSummary(trips: DispatchTrip[]) {
  return {
    total: trips.length,
    active: trips.filter((trip) => trip.statusCode === "active").length,
    delayed: trips.filter((trip) => trip.statusCode === "delayed").length,
    needsAction: trips.filter((trip) =>
      ["needs_driver", "needs_vehicle", "partner_pending", "delayed"].includes(trip.statusCode)
    ).length,
    helsingbuss: trips.filter((trip) => trip.sourceType === "helsingbuss").length,
    sundra: trips.filter((trip) => trip.sourceType === "sundra").length,
    flygbuss: trips.filter((trip) => trip.sourceType === "flygbuss").length,
  };
}