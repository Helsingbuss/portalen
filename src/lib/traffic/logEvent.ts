// src/lib/traffic/logEvent.ts

type LogTrafficEventInput = {
  event_type?: "deviation" | "note" | "assignment" | "status" | "vehicle" | "driver" | "system";
  severity?: "info" | "warning" | "critical";
  status?: "open" | "in_progress" | "resolved" | "archived";
  source_type?: "helsingbuss" | "sundra" | "flygbuss" | "manual";
  source_id?: string | null;
  title: string;
  message?: string | null;
  created_by?: string | null;
};

export async function logTrafficEvent(supabase: any, input: LogTrafficEventInput) {
  try {
    if (!supabase) return;

    const { error } = await supabase.from("traffic_events").insert({
      event_type: input.event_type || "system",
      severity: input.severity || "info",
      status: input.status || "resolved",
      source_type: input.source_type || "manual",
      source_id: input.source_id || null,
      title: input.title,
      message: input.message || null,
      created_by: input.created_by || "Trafikledning",
    });

    if (error) {
      console.warn("Kunde inte skapa trafikhistorik:", error.message || error);
    }
  } catch (error: any) {
    console.warn("Kunde inte skapa trafikhistorik:", error?.message || error);
  }
}