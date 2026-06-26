import { useEffect, useMemo, useState } from "react";
import TripAssignmentDrawer from "./TripAssignmentDrawer";
import { getTrafficVehicleBlockClasses } from "../../lib/traffic/resources";

type VehicleBlock = {
  source_type?: "manual" | "booking" | "sundra" | "flygbuss" | "workshop" | "unavailable";
  id: string;
  title: string;
  reason: string | null;
  start_at: string;
  end_at: string;
  status: "reserved" | "in_traffic" | "workshop" | "unavailable" | "service";
  traffic_vehicles?: {
    id: string;
    name: string;
    registration_number: string | null;
    owner_type: "own" | "partner";
    partner_name: string | null;
    seats: number | null;
    status: string;
  } | null;
};

type DispatchTrip = {
  id: string;
  sourceType: "helsingbuss" | "sundra" | "flygbuss";
  sourceLabel: string;
  sourceId: string | null;
  date: string | null;
  time: string | null;
  title: string;
  route: string;
  driver: string;
  vehicle: string;
  status: string;
  statusCode: string;
  passengers: number | null;
};

type SourceFilter = "all" | "helsingbuss" | "sundra" | "flygbuss";
type PlanViewMode = "upcoming" | "archive";

const sourceFilterOptions: { id: SourceFilter; label: string }[] = [
  { id: "all", label: "Alla" },
  { id: "helsingbuss", label: "Helsingbuss" },
  { id: "sundra", label: "Sundra" },
  { id: "flygbuss", label: "Flygbuss" },
];

const timelineHours = ["04", "06", "08", "10", "12", "14", "16", "18", "20", "22", "24"];

function sourceBadgeClass(sourceType: DispatchTrip["sourceType"]) {
  if (sourceType === "flygbuss") return "bg-teal-50 text-teal-700 ring-teal-100";
  if (sourceType === "sundra") return "bg-rose-50 text-rose-700 ring-rose-100";
  return "bg-slate-950 text-white ring-slate-950";
}

function blockClass(trip: DispatchTrip) {
  if (trip.statusCode === "needs_driver") return "bg-amber-400 text-slate-950 shadow-amber-200/70";
  if (trip.statusCode === "needs_vehicle") return "bg-orange-500 text-white shadow-orange-200/70";
  if (trip.statusCode === "partner_pending") return "bg-purple-500 text-white shadow-purple-200/70";
  if (trip.statusCode === "delayed") return "bg-orange-500 text-white shadow-orange-200/70";
  if (trip.statusCode === "cancelled") return "bg-rose-500 text-white shadow-rose-200/70";
  if (trip.sourceType === "flygbuss") return "bg-teal-600 text-white shadow-teal-200/70";
  if (trip.sourceType === "sundra") return "bg-rose-500 text-white shadow-rose-200/70";
  return "bg-slate-900 text-white shadow-slate-300/70";
}

function statusPillClass(statusCode: string) {
  if (statusCode === "needs_driver") return "bg-amber-50 text-amber-700 ring-amber-100";
  if (statusCode === "needs_vehicle") return "bg-orange-50 text-orange-700 ring-orange-100";
  if (statusCode === "partner_pending") return "bg-purple-50 text-purple-700 ring-purple-100";
  if (statusCode === "delayed") return "bg-orange-50 text-orange-700 ring-orange-100";
  if (statusCode === "cancelled") return "bg-rose-50 text-rose-700 ring-rose-100";
  return "bg-sky-50 text-sky-700 ring-sky-100";
}

function timeToLeftPercent(time: string | null) {
  if (!time || !time.includes(":")) return 0;

  const [hourRaw, minuteRaw] = time.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0;

  const startHour = 4;
  const endHour = 24;
  const totalMinutes = (endHour - startHour) * 60;
  const currentMinutes = Math.max(0, Math.min(totalMinutes, (hour - startHour) * 60 + minute));

  return (currentMinutes / totalMinutes) * 100;
}

function getBlockWidth(trip: DispatchTrip) {
  if (trip.sourceType === "flygbuss") return 14;
  if (trip.sourceType === "sundra") return 22;
  return 26;
}

function groupKey(date: string | null) {
  return date || "Datum saknas";
}

function resourceName(trip: DispatchTrip) {
  if (trip.vehicle && trip.vehicle !== "Saknas") return trip.vehicle;
  if (trip.driver && trip.driver !== "Saknas") return trip.driver;
  return `${trip.sourceLabel} · Ej tilldelat`;
}


function formatDateTime(value: string) {
  try {
    return new Intl.DateTimeFormat("sv-SE", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function blockVehicleName(block: VehicleBlock) {
  const vehicle = block.traffic_vehicles;
  if (!vehicle) return "Fordon saknas";

  if (vehicle.owner_type === "partner") {
    return `${vehicle.name}${vehicle.partner_name ? ` · ${vehicle.partner_name}` : ""}`;
  }

  return vehicle.name;
}

function blockStatusLabel(status: VehicleBlock["status"]) {
  switch (status) {
    case "reserved":
      return "Reserverad";
    case "in_traffic":
      return "I trafik";
    case "workshop":
      return "Verkstad";
    case "unavailable":
      return "Otillgänglig";
    case "service":
      return "Service";
    default:
      return "Blockerad";
  }
}

function todayYmd() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isArchivedVisualTrip(trip: DispatchTrip) {
  if (!trip.date) return false;
  return trip.date < todayYmd();
}

function isArchivedVehicleBlock(block: VehicleBlock) {
  const end = new Date(block.end_at).getTime();
  if (!Number.isFinite(end)) return false;
  return end < Date.now();
}
export default function VisualPlanLivePanel() {
  const [trips, setTrips] = useState<DispatchTrip[]>([]);
  const [blocks, setBlocks] = useState<VehicleBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [selectedTrip, setSelectedTrip] = useState<DispatchTrip | null>(null);
  const [activeSource, setActiveSource] = useState<SourceFilter>("all");
  const [planViewMode, setPlanViewMode] = useState<PlanViewMode>("upcoming");

  useEffect(() => {
    let alive = true;

    async function loadTrips() {
      try {
        setLoading(true);
        setErrorText("");

        const [tripsResponse, blocksResponse] = await Promise.all([
          fetch("/api/traffic/dispatch-trips"),
          fetch("/api/traffic/vehicle-blocks"),
        ]);

        const tripsJson = await tripsResponse.json();
        const blocksJson = await blocksResponse.json();

        if (!tripsResponse.ok || !tripsJson.ok) {
          throw new Error(tripsJson.error || "Kunde inte hämta körningar.");
        }

        if (!blocksResponse.ok || !blocksJson.ok) {
          throw new Error(blocksJson.error || "Kunde inte hämta fordonsblockeringar.");
        }

        if (alive) {
          setTrips(Array.isArray(tripsJson.trips) ? tripsJson.trips : []);
          setBlocks(Array.isArray(blocksJson.blocks) ? blocksJson.blocks : []);
        }
      } catch (error: any) {
        if (alive) {
          setErrorText(error?.message || "Kunde inte hämta körningar.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadTrips();

    return () => {
      alive = false;
    };
  }, []);

  const filteredTrips = useMemo(() => {
    const bySource =
      activeSource === "all"
        ? trips
        : trips.filter((trip) => trip.sourceType === activeSource);

    return bySource.filter((trip) =>
      planViewMode === "archive"
        ? isArchivedVisualTrip(trip)
        : !isArchivedVisualTrip(trip)
    );
  }, [trips, activeSource, planViewMode]);

  const filteredBlocks = useMemo(() => {
    const bySource = activeSource === "all"
      ? blocks
      : blocks.filter((block) => {
          if (activeSource === "helsingbuss") {
            return block.source_type === "booking" || block.source_type === "manual";
          }

          return block.source_type === activeSource;
        });

    return bySource.filter((block) =>
      planViewMode === "archive"
        ? isArchivedVehicleBlock(block)
        : !isArchivedVehicleBlock(block)
    );
  }, [blocks, activeSource, planViewMode]);

  const summary = useMemo(() => {
    return {
      total: filteredTrips.length,
      helsingbuss: filteredTrips.filter((trip) => trip.sourceType === "helsingbuss").length,
      sundra: filteredTrips.filter((trip) => trip.sourceType === "sundra").length,
      flygbuss: filteredTrips.filter((trip) => trip.sourceType === "flygbuss").length,
      needsAction: filteredTrips.filter((trip) =>
        ["needs_driver", "needs_vehicle", "partner_pending", "delayed"].includes(trip.statusCode)
      ).length,
      blocks: filteredBlocks.length,
    };
  }, [filteredTrips, filteredBlocks]);

  const grouped = useMemo(() => {
    const map = new Map<string, DispatchTrip[]>();

    for (const trip of filteredTrips) {
      const key = groupKey(trip.date);
      const list = map.get(key) || [];
      list.push(trip);
      map.set(key, list);
    }

    return Array.from(map.entries());
  }, [filteredTrips, filteredBlocks]);

  if (loading) {
    return (
      <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <p className="text-sm font-bold text-slate-500">
          Hämtar VisualPlan 3D från riktig trafikdata...
        </p>
      </div>
    );
  }

  if (errorText) {
    return (
      <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-rose-100">
        <p className="text-sm font-bold text-rose-700">{errorText}</p>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
            VisualPlan 3D
          </p>

          <h2 className="mt-2 text-2xl font-bold text-slate-950">
            Trafikplanering
          </h2>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Körningar från Helsingbuss, Sundra och Flygbuss visas som planeringsblock på tidslinjen.
          </p>
        </div>

        <button
          type="button"
          onClick={() => alert("Nästa steg: lägga in partnerbuss, verkstad och otillgänglighet som riktiga blockeringar.")}
          className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-800"
        >
          Lägg blockering
        </button>
      </div>


      <div className="mt-6 rounded-2xl bg-slate-50 p-2 ring-1 ring-slate-100">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p className="px-3 text-xs font-bold uppercase tracking-wide text-slate-400">
            Välj område
          </p>

          <div className="flex flex-wrap gap-2">
            {sourceFilterOptions.map((option) => {
              const active = option.id === activeSource;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setActiveSource(option.id)}
                  className={
                    active
                      ? "rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white shadow-sm"
                      : "rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-600 ring-1 ring-slate-100 transition hover:bg-slate-100"
                  }
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-2xl bg-slate-50 p-2 ring-1 ring-slate-100">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p className="px-3 text-xs font-bold uppercase tracking-wide text-slate-400">
            Visningsläge
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPlanViewMode("upcoming")}
              className={
                planViewMode === "upcoming"
                  ? "rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white shadow-sm"
                  : "rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-600 ring-1 ring-slate-100 transition hover:bg-slate-100"
              }
            >
              Kommande
            </button>

            <button
              type="button"
              onClick={() => setPlanViewMode("archive")}
              className={
                planViewMode === "archive"
                  ? "rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white shadow-sm"
                  : "rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-600 ring-1 ring-slate-100 transition hover:bg-slate-100"
              }
            >
              Arkiv
            </button>
          </div>
        </div>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-6">
        <SummaryCard label={planViewMode === "archive" ? "Arkiv" : "Kommande"} value={summary.total} />
        <SummaryCard label="Helsingbuss" value={summary.helsingbuss} />
        <SummaryCard label="Sundra" value={summary.sundra} />
        <SummaryCard label="Flygbuss" value={summary.flygbuss} />
        <SummaryCard label="Åtgärd" value={summary.needsAction} warning />
        <SummaryCard label="Blockeringar" value={summary.blocks} warning />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <LegendDot label="Helsingbuss" color="bg-slate-900" />
        <LegendDot label="Sundra" color="bg-rose-500" />
        <LegendDot label="Flygbuss" color="bg-teal-600" />
        <LegendDot label="Saknar förare/fordon" color="bg-orange-500" />
        <LegendDot label="Partner" color="bg-purple-500" />
      </div>

      <div className="mt-6 space-y-8">
        {grouped.map(([date, items]) => (
          <section
            key={date}
            className="rounded-[32px] border border-slate-100 bg-slate-50/70 p-4 shadow-inner"
          >
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-950">{date}</h3>
                <p className="text-xs font-semibold text-slate-400">
                  {items.length} körningar i planeringen
                </p>
              </div>

              <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-100">
                04:00–24:00
              </span>
            </div>

            <div className="overflow-x-auto rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-slate-100">
              <div className="min-w-[980px]">
                <div className="grid grid-cols-[220px_1fr] gap-4">
                  <div />

                  <div className="grid grid-cols-11 text-[11px] font-bold text-slate-400">
                    {timelineHours.map((hour) => (
                      <span key={hour}>{hour}:00</span>
                    ))}
                  </div>
                </div>

                <div className="mt-3 space-y-3">
                  {items.map((trip) => {
                    const left = timeToLeftPercent(trip.time);
                    const width = getBlockWidth(trip);

                    return (
                      <div
                        key={trip.id}
                        className="grid grid-cols-[220px_1fr] gap-4"
                      >
                        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                          <p className="truncate text-sm font-bold text-slate-950">
                            {resourceName(trip)}
                          </p>

                          <p className="mt-1 truncate text-xs text-slate-500">
                            {trip.route}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${sourceBadgeClass(trip.sourceType)}`}>
                              {trip.sourceLabel}
                            </span>

                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${statusPillClass(trip.statusCode)}`}>
                              {trip.status}
                            </span>
                          </div>
                        </div>

                        <div className="relative h-[92px] overflow-hidden rounded-[24px] bg-gradient-to-br from-slate-100 via-white to-slate-200 shadow-inner ring-1 ring-slate-100">
                          <div className="absolute inset-0 grid grid-cols-10">
                            {Array.from({ length: 10 }).map((_, index) => (
                              <div
                                key={index}
                                className="border-l border-slate-200/80 first:border-l-0"
                              />
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedTrip(trip)}
                            className={`absolute top-4 rounded-2xl px-4 py-3 text-left text-xs font-bold shadow-xl transition hover:-translate-y-1 hover:shadow-2xl ${blockClass(trip)}`}
                            style={{
                              left: `${Math.min(88, Math.max(0, left))}%`,
                              width: `${width}%`,
                            }}
                          >
                            <span className="block truncate">
                              {trip.time || "--:--"} · {trip.title}
                            </span>

                            <span className="mt-1 block truncate text-[10px] font-semibold opacity-80">
                              {trip.passengers !== null ? `${trip.passengers} resenärer · ` : ""}
                              {trip.sourceId || trip.sourceLabel}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>      {selectedTrip && (
        <TripAssignmentDrawer
          trip={selectedTrip}
          onClose={() => setSelectedTrip(null)}
          onSaved={() => window.location.reload()}
        />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-4 ring-1 ${warning ? "bg-orange-50 text-orange-700 ring-orange-100" : "bg-slate-50 text-slate-700 ring-slate-100"}`}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-70">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold">
        {value}
      </p>
    </div>
  );
}

function LegendDot({
  label,
  color,
}: {
  label: string;
  color: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-100">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}