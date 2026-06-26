import { useEffect, useMemo, useState } from "react";
import {
  getDispatchSourceClasses,
  getDispatchStatusClasses,
} from "../../lib/traffic/dispatchTrips";
import TripAssignmentDrawer from "./TripAssignmentDrawer";

type SourceFilter = "all" | "helsingbuss" | "sundra" | "flygbuss";
type ViewMode = "upcoming" | "archive";

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
  statusCode:
    | "planned"
    | "active"
    | "delayed"
    | "needs_driver"
    | "needs_vehicle"
    | "partner_pending"
    | "completed"
    | "cancelled";
  passengers: number | null;
};

const sourceOptions: { id: SourceFilter; label: string }[] = [
  { id: "all", label: "Alla" },
  { id: "helsingbuss", label: "Helsingbuss" },
  { id: "sundra", label: "Sundra" },
  { id: "flygbuss", label: "Flygbuss" },
];

function todayYmd() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isArchivedTrip(trip: DispatchTrip) {
  if (!trip.date) return false;
  return trip.date < todayYmd();
}

function sortTrips(trips: DispatchTrip[], viewMode: ViewMode) {
  return [...trips].sort((a, b) => {
    const av = `${a.date || ""} ${a.time || ""}`;
    const bv = `${b.date || ""} ${b.time || ""}`;

    return viewMode === "archive" ? bv.localeCompare(av) : av.localeCompare(bv);
  });
}

export default function DispatchTripsPanel() {
  const [trips, setTrips] = useState<DispatchTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [activeSource, setActiveSource] = useState<SourceFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("upcoming");
  const [selectedTrip, setSelectedTrip] = useState<DispatchTrip | null>(null);

  useEffect(() => {
    let alive = true;

    async function loadTrips() {
      try {
        setLoading(true);
        setErrorText("");

        const response = await fetch("/api/traffic/dispatch-trips");
        const json = await response.json();

        if (!response.ok || !json.ok) {
          throw new Error(json.error || "Kunde inte hämta körningar.");
        }

        if (alive) {
          setTrips(Array.isArray(json.trips) ? json.trips : []);
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

    const byArchive = bySource.filter((trip) =>
      viewMode === "archive" ? isArchivedTrip(trip) : !isArchivedTrip(trip)
    );

    return sortTrips(byArchive, viewMode);
  }, [trips, activeSource, viewMode]);

  const summary = useMemo(() => {
    return {
      total: filteredTrips.length,
      helsingbuss: filteredTrips.filter((trip) => trip.sourceType === "helsingbuss").length,
      sundra: filteredTrips.filter((trip) => trip.sourceType === "sundra").length,
      flygbuss: filteredTrips.filter((trip) => trip.sourceType === "flygbuss").length,
      needsAction: filteredTrips.filter((trip) =>
        ["needs_driver", "needs_vehicle", "partner_pending", "delayed"].includes(trip.statusCode)
      ).length,
    };
  }, [filteredTrips]);

  if (loading) {
    return (
      <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-500 ring-1 ring-slate-100">
        Hämtar körningar från Helsingbuss, Sundra och Flygbuss...
      </div>
    );
  }

  if (errorText) {
    return (
      <div className="mt-6 rounded-2xl bg-rose-50 p-5 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
        {errorText}
      </div>
    );
  }

  return (
    <>
      <div className="mt-6 rounded-2xl bg-slate-50 p-2 ring-1 ring-slate-100">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {sourceOptions.map((option) => {
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

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setViewMode("upcoming")}
              className={
                viewMode === "upcoming"
                  ? "rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white shadow-sm"
                  : "rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-600 ring-1 ring-slate-100 transition hover:bg-slate-100"
              }
            >
              Kommande
            </button>

            <button
              type="button"
              onClick={() => setViewMode("archive")}
              className={
                viewMode === "archive"
                  ? "rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white shadow-sm"
                  : "rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-600 ring-1 ring-slate-100 transition hover:bg-slate-100"
              }
            >
              Arkiv
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-5">
        <SummaryCard label={viewMode === "archive" ? "Arkiv" : "Kommande"} value={summary.total} />
        <SummaryCard label="Helsingbuss" value={summary.helsingbuss} tone="dark" />
        <SummaryCard label="Sundra" value={summary.sundra} tone="rose" />
        <SummaryCard label="Flygbuss" value={summary.flygbuss} tone="teal" />
        <SummaryCard label="Kräver åtgärd" value={summary.needsAction} tone="orange" />
      </div>

      {filteredTrips.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-slate-50 p-6 text-sm font-semibold text-slate-500 ring-1 ring-slate-100">
          Inga körningar hittades för valt område och läge.
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {filteredTrips.map((trip) => (
            <button
              key={trip.id}
              type="button"
              onClick={() => setSelectedTrip(trip)}
              className="w-full rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-left transition hover:bg-white hover:shadow-sm"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${getDispatchSourceClasses(trip.sourceType)}`}>
                      {trip.sourceLabel}
                    </span>

                    <p className="font-bold text-slate-950">
                      {trip.date || "Datum saknas"} · {trip.time || "--:--"} · {trip.title}
                    </p>
                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    {trip.route} · {trip.driver} · {trip.vehicle}
                  </p>

                  {trip.passengers !== null && (
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      {trip.passengers} resenärer
                    </p>
                  )}
                </div>

                <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${getDispatchStatusClasses(trip.statusCode)}`}>
                  {trip.status}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
      {selectedTrip && (
        <TripAssignmentDrawer
          trip={selectedTrip}
          onClose={() => setSelectedTrip(null)}
          onSaved={() => {
            setSelectedTrip(null);
          }}
        />
      )}
    </>
  );
}

function SummaryCard({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number;
  tone?: "slate" | "dark" | "rose" | "teal" | "orange";
}) {
  const classes =
    tone === "dark"
      ? "bg-slate-950 text-white"
      : tone === "rose"
      ? "bg-rose-50 text-rose-700 ring-1 ring-rose-100"
      : tone === "teal"
      ? "bg-teal-50 text-teal-700 ring-1 ring-teal-100"
      : tone === "orange"
      ? "bg-orange-50 text-orange-700 ring-1 ring-orange-100"
      : "bg-slate-50 text-slate-700 ring-1 ring-slate-100";

  return (
    <div className={`rounded-2xl p-4 ${classes}`}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold">
        {value}
      </p>
    </div>
  );
}