import { supabase } from "../lib/supabase";

export type DriverScheduleItem = {
  id: string;
  title: string;
  scheduleType: string;
  status: string;
  scheduleDate: string;
  startTime: string;
  endTime: string;
  location: string;
  notes: string;
  driverOrderId: string;
  sourceType: string;
  sourceId: string;
  canOpenOrder: boolean;
};

export async function getMyDriverSchedule(days = 60): Promise<DriverScheduleItem[]> {
  const { data, error } = await supabase.rpc("get_my_driver_schedule", {
    p_days: days,
  });

  if (error) throw new Error(error.message);

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  if (!raw?.ok) {
    throw new Error(raw?.error || "Kunde inte hämta schema.");
  }

  return Array.isArray(raw.schedule)
    ? raw.schedule.map((row: any) => ({
        id: String(row.id || ""),
        title: String(row.title || "Arbetspass"),
        scheduleType: String(row.scheduleType || "driving"),
        status: String(row.status || "planned"),
        scheduleDate: String(row.scheduleDate || ""),
        startTime: String(row.startTime || ""),
        endTime: String(row.endTime || ""),
        location: String(row.location || ""),
        notes: String(row.notes || ""),
        driverOrderId: String(row.driverOrderId || ""),
        sourceType: String(row.sourceType || ""),
        sourceId: String(row.sourceId || ""),
        canOpenOrder: Boolean(row.canOpenOrder),
      }))
    : [];
}

export function getScheduleTypeLabel(type: string) {
  if (type === "sundra") return "Sundra";
  if (type === "flygbuss") return "Flygbuss";
  if (type === "standby") return "Beredskap";
  if (type === "depot") return "Depå";
  if (type === "vehicle_check") return "Fordonskontroll";
  if (type === "day_off") return "Ledig";
  if (type === "admin") return "Administration";

  return "Körning";
}

export function formatScheduleDate(value: string) {
  if (!value) return "Datum saknas";

  const date = new Date(value + "T12:00:00");

  return new Intl.DateTimeFormat("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}
