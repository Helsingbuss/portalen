// src/lib/traffic/resources.ts

export type TrafficVehicleOwnerType = "own" | "partner";

export type TrafficVehicleStatus =
  | "available"
  | "in_traffic"
  | "reserved"
  | "workshop"
  | "unavailable"
  | "inactive";

export type TrafficVehicleBlockStatus =
  | "reserved"
  | "in_traffic"
  | "workshop"
  | "unavailable"
  | "service";

export type TrafficVehicle = {
  id: string;
  name: string;
  registration_number: string | null;
  owner_type: TrafficVehicleOwnerType;
  partner_name: string | null;
  vehicle_type: string | null;
  seats: number | null;
  status: TrafficVehicleStatus;
  notes: string | null;
};

export type TrafficVehicleBlock = {
  id: string;
  vehicle_id: string;
  source_type: "manual" | "booking" | "sundra" | "flygbuss" | "workshop" | "unavailable";
  source_id: string | null;
  title: string;
  reason: string | null;
  start_at: string;
  end_at: string;
  status: TrafficVehicleBlockStatus;
};

export function getTrafficVehicleStatusLabel(status: TrafficVehicleStatus) {
  switch (status) {
    case "available":
      return "Tillgänglig";
    case "in_traffic":
      return "I trafik";
    case "reserved":
      return "Reserverad";
    case "workshop":
      return "Verkstad";
    case "unavailable":
      return "Otillgänglig";
    case "inactive":
      return "Inaktiv";
    default:
      return "Okänd";
  }
}

export function getTrafficVehicleStatusClasses(status: TrafficVehicleStatus) {
  switch (status) {
    case "available":
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    case "in_traffic":
      return "bg-sky-50 text-sky-700 ring-sky-100";
    case "reserved":
      return "bg-teal-50 text-teal-700 ring-teal-100";
    case "workshop":
      return "bg-rose-50 text-rose-700 ring-rose-100";
    case "unavailable":
      return "bg-orange-50 text-orange-700 ring-orange-100";
    case "inactive":
      return "bg-slate-50 text-slate-600 ring-slate-100";
    default:
      return "bg-slate-50 text-slate-600 ring-slate-100";
  }
}

export function getTrafficVehicleBlockClasses(status: TrafficVehicleBlockStatus) {
  switch (status) {
    case "reserved":
      return "bg-teal-600 text-white shadow-teal-200/70";
    case "in_traffic":
      return "bg-sky-600 text-white shadow-sky-200/70";
    case "workshop":
      return "bg-rose-500 text-white shadow-rose-200/70";
    case "unavailable":
      return "bg-orange-500 text-white shadow-orange-200/70";
    case "service":
      return "bg-slate-400 text-white shadow-slate-200/70";
    default:
      return "bg-slate-400 text-white shadow-slate-200/70";
  }
}