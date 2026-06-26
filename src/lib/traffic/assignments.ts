// src/lib/traffic/assignments.ts

export type TrafficDriverStatus =
  | "available"
  | "busy"
  | "off"
  | "sick"
  | "inactive";

export type TrafficAssignmentStatus =
  | "planned"
  | "assigned"
  | "in_traffic"
  | "completed"
  | "cancelled"
  | "needs_action";

export type TrafficSourceType = "helsingbuss" | "sundra" | "flygbuss";

export type TrafficDriver = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: TrafficDriverStatus;
  license_notes: string | null;
  notes: string | null;
};

export type TrafficTripAssignment = {
  id: string;
  source_type: TrafficSourceType;
  source_id: string;
  title: string | null;
  driver_id: string | null;
  vehicle_id: string | null;
  status: TrafficAssignmentStatus;
  planned_start_at: string | null;
  planned_end_at: string | null;
  notes: string | null;
};

export function getTrafficDriverStatusLabel(status: TrafficDriverStatus) {
  switch (status) {
    case "available":
      return "Tillgänglig";
    case "busy":
      return "Upptagen";
    case "off":
      return "Ledig";
    case "sick":
      return "Frånvarande";
    case "inactive":
      return "Inaktiv";
    default:
      return "Okänd";
  }
}

export function getTrafficAssignmentStatusLabel(status: TrafficAssignmentStatus) {
  switch (status) {
    case "planned":
      return "Planerad";
    case "assigned":
      return "Tilldelad";
    case "in_traffic":
      return "I trafik";
    case "completed":
      return "Klar";
    case "cancelled":
      return "Avbruten";
    case "needs_action":
      return "Kräver åtgärd";
    default:
      return "Okänd";
  }
}