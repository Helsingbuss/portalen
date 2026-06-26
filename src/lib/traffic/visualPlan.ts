// src/lib/traffic/visualPlan.ts

export type VisualPlanStatus =
  | "planned"
  | "driver_free"
  | "driver_missing_vehicle"
  | "vehicle_missing_driver"
  | "vehicle_workshop"
  | "partner"
  | "service";

export type VisualPlanRowStatus =
  | "available"
  | "busy"
  | "warning"
  | "blocked"
  | "partner";

export type VisualPlanViewMode = "day" | "week";

export type VisualPlanBlock = {
  id: string;
  title: string;
  meta: string;
  start: string;
  width: string;
  status: VisualPlanStatus;
  subtitle?: string;
  end?: string;
};

export type VisualPlanRow = {
  id: string;
  resource: string;
  driver: string;
  rowStatus: VisualPlanRowStatus;
  statusLabel: string;
  blocks: VisualPlanBlock[];

  // Behålls för framtida ny struktur
  name?: string;
  subtitle?: string;
  status?: VisualPlanRowStatus;
};

export const visualPlanLegend = [
  {
    label: "Planerad körning",
    status: "planned" as const,
    color: "bg-teal-500",
  },
  {
    label: "Chaufför ledig",
    status: "driver_free" as const,
    color: "bg-sky-500",
  },
  {
    label: "Chaufför saknar fordon",
    status: "driver_missing_vehicle" as const,
    color: "bg-orange-500",
  },
  {
    label: "Fordon saknar förare",
    status: "vehicle_missing_driver" as const,
    color: "bg-amber-400",
  },
  {
    label: "Fordon i verkstad",
    status: "vehicle_workshop" as const,
    color: "bg-rose-500",
  },
  {
    label: "Partnerkörning",
    status: "partner" as const,
    color: "bg-purple-500",
  },
  {
    label: "Paus / service",
    status: "service" as const,
    color: "bg-slate-300",
  },
];

export function getVisualPlanRowsForDate(
  _selectedDate: Date,
  _viewMode: VisualPlanViewMode
): VisualPlanRow[] {
  return [];
}

export function getVisualPlanBlockClasses(status: VisualPlanStatus) {
  switch (status) {
    case "planned":
      return "bg-teal-500 text-white ring-teal-600/20";
    case "driver_free":
      return "bg-sky-500 text-white ring-sky-600/20";
    case "driver_missing_vehicle":
      return "bg-orange-500 text-white ring-orange-600/20";
    case "vehicle_missing_driver":
      return "bg-amber-400 text-slate-950 ring-amber-500/20";
    case "vehicle_workshop":
      return "bg-rose-500 text-white ring-rose-600/20";
    case "partner":
      return "bg-purple-500 text-white ring-purple-600/20";
    case "service":
      return "bg-slate-300 text-slate-800 ring-slate-400/20";
    default:
      return "bg-slate-200 text-slate-700 ring-slate-300/20";
  }
}

export function getVisualPlanRowStatusClasses(status: VisualPlanRowStatus) {
  switch (status) {
    case "available":
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    case "busy":
      return "bg-sky-50 text-sky-700 ring-sky-100";
    case "warning":
      return "bg-orange-50 text-orange-700 ring-orange-100";
    case "blocked":
      return "bg-rose-50 text-rose-700 ring-rose-100";
    case "partner":
      return "bg-purple-50 text-purple-700 ring-purple-100";
    default:
      return "bg-slate-50 text-slate-600 ring-slate-100";
  }
}

export function getVisualPlanSummary(rows: VisualPlanRow[]) {
  const allBlocks = rows.flatMap((row) => row.blocks);

  return {
    totalRows: rows.length,
    planned: allBlocks.filter((block) => block.status === "planned").length,
    warnings: allBlocks.filter((block) =>
      ["driver_missing_vehicle", "vehicle_missing_driver", "vehicle_workshop"].includes(block.status)
    ).length,
    partners: allBlocks.filter((block) => block.status === "partner").length,

    availableDrivers: rows.filter((row) => row.rowStatus === "available").length,
    missingResources: allBlocks.filter((block) =>
      ["driver_missing_vehicle", "vehicle_missing_driver"].includes(block.status)
    ).length,
    workshopVehicles: allBlocks.filter((block) => block.status === "vehicle_workshop").length,
  };
}