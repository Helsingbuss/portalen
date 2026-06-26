// src/lib/traffic/events.ts

export type TrafficEventType =
  | "deviation"
  | "note"
  | "assignment"
  | "status"
  | "vehicle"
  | "driver"
  | "system";

export type TrafficEventSeverity =
  | "info"
  | "warning"
  | "critical";

export type TrafficEventStatus =
  | "open"
  | "in_progress"
  | "resolved"
  | "archived";

export type TrafficEventSourceType =
  | "helsingbuss"
  | "sundra"
  | "flygbuss"
  | "manual";

export type TrafficEvent = {
  id: string;
  event_type: TrafficEventType;
  severity: TrafficEventSeverity;
  status: TrafficEventStatus;
  source_type: TrafficEventSourceType;
  source_id: string | null;
  title: string;
  message: string | null;
  created_at: string;
  resolved_at: string | null;
};

export function getTrafficEventTypeLabel(type: TrafficEventType) {
  switch (type) {
    case "deviation":
      return "Avvikelse";
    case "note":
      return "Notering";
    case "assignment":
      return "Koppling";
    case "status":
      return "Status";
    case "vehicle":
      return "Fordon";
    case "driver":
      return "Förare";
    case "system":
      return "System";
    default:
      return "Händelse";
  }
}

export function getTrafficEventSeverityClasses(severity: TrafficEventSeverity) {
  switch (severity) {
    case "critical":
      return "bg-rose-50 text-rose-700 ring-rose-100";
    case "warning":
      return "bg-orange-50 text-orange-700 ring-orange-100";
    case "info":
      return "bg-sky-50 text-sky-700 ring-sky-100";
    default:
      return "bg-slate-50 text-slate-600 ring-slate-100";
  }
}

export function getTrafficEventStatusLabel(status: TrafficEventStatus) {
  switch (status) {
    case "open":
      return "Öppen";
    case "in_progress":
      return "Pågår";
    case "resolved":
      return "Löst";
    case "archived":
      return "Arkiverad";
    default:
      return "Okänd";
  }
}