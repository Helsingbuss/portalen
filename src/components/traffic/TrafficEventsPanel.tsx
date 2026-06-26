import { useEffect, useMemo, useState } from "react";
import {
  getTrafficEventSeverityClasses,
  getTrafficEventStatusLabel,
  getTrafficEventTypeLabel,
} from "../../lib/traffic/events";

type EventMode = "deviations" | "history";

type TrafficEvent = {
  id: string;
  event_type: "deviation" | "note" | "assignment" | "status" | "vehicle" | "driver" | "system";
  severity: "info" | "warning" | "critical";
  status: "open" | "in_progress" | "resolved" | "archived";
  source_type: "helsingbuss" | "sundra" | "flygbuss" | "manual";
  source_id: string | null;
  title: string;
  message: string | null;
  created_at: string;
  resolved_at: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "Tid saknas";

  try {
    return new Intl.DateTimeFormat("sv-SE", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function sourceLabel(source: TrafficEvent["source_type"]) {
  switch (source) {
    case "helsingbuss":
      return "Helsingbuss";
    case "sundra":
      return "Sundra";
    case "flygbuss":
      return "Flygbuss";
    default:
      return "Manuell";
  }
}

export default function TrafficEventsPanel({ mode }: { mode: EventMode }) {
  const [events, setEvents] = useState<TrafficEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");

  async function loadEvents() {
    try {
      setLoading(true);
      setErrorText("");

      const response = await fetch("/api/traffic/events");
      const json = await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta händelser.");
      }

      setEvents(Array.isArray(json.events) ? json.events : []);
    } catch (error: any) {
      setErrorText(error?.message || "Kunde inte hämta händelser.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  const visibleEvents = useMemo(() => {
    if (mode === "deviations") {
      return events.filter((event) =>
        event.event_type === "deviation" &&
        event.status !== "archived"
      );
    }

    return events.filter((event) =>
      event.status === "resolved" ||
      event.status === "archived" ||
      event.event_type !== "deviation"
    );
  }, [events, mode]);

  async function createDeviation() {
    const title = window.prompt("Rubrik på avvikelsen:");
    if (!title?.trim()) return;

    const message = window.prompt("Beskriv avvikelsen kort:", "") || "";
    const severityAnswer = (window.prompt("Nivå: info, varning eller kritisk", "varning") || "").toLowerCase();

    const severity =
      severityAnswer.includes("krit")
        ? "critical"
        : severityAnswer.includes("info")
        ? "info"
        : "warning";

    const response = await fetch("/api/traffic/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_type: "deviation",
        severity,
        status: "open",
        source_type: "manual",
        title,
        message,
        created_by: "Trafikledning",
      }),
    });

    const json = await response.json();

    if (!response.ok || !json.ok) {
      alert(json.error || "Kunde inte skapa avvikelse.");
      return;
    }

    await loadEvents();
  }

  async function updateEventStatus(id: string, status: TrafficEvent["status"]) {
    const response = await fetch("/api/traffic/events", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id,
        status,
      }),
    });

    const json = await response.json();

    if (!response.ok || !json.ok) {
      alert(json.error || "Kunde inte uppdatera händelsen.");
      return;
    }

    await loadEvents();
  }

  if (loading) {
    return (
      <div className="mt-6 rounded-2xl bg-slate-50 p-6 text-sm font-semibold text-slate-500 ring-1 ring-slate-100">
        Hämtar avvikelser och historik...
      </div>
    );
  }

  if (errorText) {
    return (
      <div className="mt-6 rounded-2xl bg-rose-50 p-6 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
        {errorText}
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-5">
      <div className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-100">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-950">
              {mode === "deviations" ? "Avvikelser" : "Historik"}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              {mode === "deviations"
                ? "Här hanteras öppna avvikelser, förseningar, problem och trafikledningsnoteringar."
                : "Här visas lösta, arkiverade och automatiska trafikledningshändelser."}
            </p>
          </div>

          {mode === "deviations" && (
            <button
              type="button"
              onClick={createDeviation}
              className="w-fit rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-800"
            >
              + Ny avvikelse
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <SummaryCard label="Totalt" value={visibleEvents.length} />
        <SummaryCard label="Öppna" value={visibleEvents.filter((event) => event.status === "open").length} />
        <SummaryCard label="Pågår" value={visibleEvents.filter((event) => event.status === "in_progress").length} />
        <SummaryCard label="Lösta/arkiv" value={visibleEvents.filter((event) => ["resolved", "archived"].includes(event.status)).length} />
      </div>

      {visibleEvents.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-sm font-semibold text-slate-500 ring-1 ring-slate-100">
          {mode === "deviations"
            ? "Inga avvikelser finns just nu."
            : "Ingen historik finns ännu."}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleEvents.map((event) => (
            <div
              key={event.id}
              className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${getTrafficEventSeverityClasses(event.severity)}`}>
                      {event.severity === "critical" ? "Kritisk" : event.severity === "warning" ? "Varning" : "Info"}
                    </span>

                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-100">
                      {getTrafficEventTypeLabel(event.event_type)}
                    </span>

                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-100">
                      {sourceLabel(event.source_type)}
                    </span>
                  </div>

                  <p className="mt-3 font-bold text-slate-950">{event.title}</p>

                  {event.message && (
                    <p className="mt-1 text-sm text-slate-600">{event.message}</p>
                  )}

                  <p className="mt-2 text-xs font-semibold text-slate-400">
                    Skapad {formatDate(event.created_at)}
                    {event.resolved_at ? ` · Avslutad ${formatDate(event.resolved_at)}` : ""}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-100">
                    {getTrafficEventStatusLabel(event.status)}
                  </span>

                  {event.status === "open" && (
                    <button
                      type="button"
                      onClick={() => updateEventStatus(event.id, "in_progress")}
                      className="rounded-xl bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700 ring-1 ring-sky-100 hover:bg-sky-100"
                    >
                      Påbörja
                    </button>
                  )}

                  {event.status !== "resolved" && event.status !== "archived" && (
                    <button
                      type="button"
                      onClick={() => updateEventStatus(event.id, "resolved")}
                      className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-100"
                    >
                      Markera löst
                    </button>
                  )}

                  {event.status !== "archived" && (
                    <button
                      type="button"
                      onClick={() => updateEventStatus(event.id, "archived")}
                      className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                    >
                      Arkivera
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-slate-950">
        {value}
      </p>
    </div>
  );
}