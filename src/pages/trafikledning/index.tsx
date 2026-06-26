import { useState } from "react";
import type { ReactNode } from "react";
import {
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  BellAlertIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  MapIcon,
  PhoneIcon,
  SignalIcon,
  TruckIcon,
  UserGroupIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import Header from "../../components/Header";
import VisualPlanLivePanel from "../../components/traffic/VisualPlanLivePanel";
import TrafficResourcesPanel from "../../components/traffic/TrafficResourcesPanel";
import TrafficEventsPanel from "../../components/traffic/TrafficEventsPanel";
import DispatchTripsPanel from "../../components/traffic/DispatchTripsPanel";
import {
  getDispatchSourceClasses,
  getDispatchStatusClasses,
  getDispatchSummary,
  getDispatchTripsForDate,
} from "../../lib/traffic/dispatchTrips";
import {
  getVisualPlanBlockClasses,
  getVisualPlanRowStatusClasses,
  getVisualPlanRowsForDate,
  getVisualPlanSummary,
  visualPlanLegend,
} from "../../lib/traffic/visualPlan";
type TabId =
  | "live"
  | "dagens"
  | "korningar"
  | "forare"
  | "fordon"
  | "partners"
  | "avvikelser"
  | "historik"
  | "visualplan";

const trafficTabs = [
  { id: "live" as TabId, name: "Live karta", icon: MapIcon },
  { id: "dagens" as TabId, name: "Dagens trafik", icon: ClockIcon },
  { id: "korningar" as TabId, name: "Körningar", icon: TruckIcon },
  { id: "forare" as TabId, name: "Förare", icon: UsersIcon },
  { id: "fordon" as TabId, name: "Fordon", icon: TruckIcon },
  { id: "partners" as TabId, name: "Partners", icon: UserGroupIcon },
  { id: "avvikelser" as TabId, name: "Avvikelser", icon: ExclamationTriangleIcon },
  { id: "historik" as TabId, name: "Historik", icon: ArrowPathIcon },
  { id: "visualplan" as TabId, name: "VisualPlan 3D", icon: CalendarDaysIcon },
];

const stats = [
  {
    label: "Pågående körningar",
    value: "12",
    sub: "4 startar inom 60 min",
    icon: TruckIcon,
    tone: "teal",
  },
  {
    label: "Fordon online",
    value: "9",
    sub: "1 saknar GPS-signal",
    icon: SignalIcon,
    tone: "emerald",
  },
  {
    label: "Förseningar",
    value: "3",
    sub: "störst försening +8 min",
    icon: ClockIcon,
    tone: "orange",
  },
  {
    label: "Avvikelser",
    value: "2",
    sub: "1 kräver åtgärd",
    icon: ExclamationTriangleIcon,
    tone: "rose",
  },
];

const activeVehicles = [
  {
    name: "Buss 12",
    route: "811 Flygbuss",
    status: "I tid",
    statusTone: "green",
    speed: "57 km/h",
  },
  {
    name: "811 Flygbuss",
    route: "Helsingborg C → Ängelholms Flygplats",
    status: "+4 min",
    statusTone: "orange",
    speed: "48 km/h",
  },
  {
    name: "Buss 7",
    route: "Helsingborg C → Båstad",
    status: "Ingen GPS",
    statusTone: "gray",
    speed: "–",
  },
  {
    name: "Partner 91",
    route: "Extern partnerkörning",
    status: "Partner",
    statusTone: "purple",
    speed: "62 km/h",
  },
];

const warnings = [
  {
    title: "Buss 7 – ingen GPS senaste 2 min",
    time: "10:10",
    tone: "rose",
  },
  {
    title: "811 Flygbuss – försening +4 min",
    time: "10:09",
    tone: "orange",
  },
  {
    title: "Körning saknar förare",
    time: "10:07",
    tone: "amber",
  },
];

const departures = [
  {
    time: "10:25",
    line: "Buss 5",
    route: "Helsingborg C → Höganäs",
    status: "I tid",
  },
  {
    time: "10:30",
    line: "Buss 20",
    route: "Helsingborg C → Åstorp",
    status: "I tid",
  },
  {
    time: "10:35",
    line: "811 Flygbuss",
    route: "Ängelholms Flygplats → Helsingborg C",
    status: "+2 min",
  },
];


function getToneClasses(tone?: string) {
  switch (tone) {
    case "green":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
    case "orange":
      return "bg-orange-50 text-orange-700 ring-1 ring-orange-100";
    case "purple":
      return "bg-purple-50 text-purple-700 ring-1 ring-purple-100";
    case "blue":
      return "bg-sky-50 text-sky-700 ring-1 ring-sky-100";
    case "red":
      return "bg-rose-50 text-rose-700 ring-1 ring-rose-100";
    case "teal":
      return "bg-teal-50 text-teal-700 ring-1 ring-teal-100";
    default:
      return "bg-slate-50 text-slate-600 ring-1 ring-slate-100";
  }
}

function getStatusDot(tone?: string) {
  switch (tone) {
    case "green":
      return "bg-emerald-500";
    case "orange":
      return "bg-orange-500";
    case "purple":
      return "bg-purple-500";
    case "red":
      return "bg-rose-500";
    case "blue":
      return "bg-sky-500";
    default:
      return "bg-slate-400";
  }
}

function Panel({
  title,
  action,
  onAction,
  children,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-950">{title}</h2>

        {action && (
          <button
            type="button"
            onClick={onAction}
            className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-100 transition hover:bg-slate-100"
          >
            {action}
          </button>
        )}
      </div>

      {children}
    </section>
  );
}

function WarningCard({ warning }: { warning: any }) {
  return (
    <button
      type="button"
      onClick={() => alert(warning.title || "Avvikelse")}
      className="w-full rounded-2xl bg-orange-50 p-4 text-left ring-1 ring-orange-100 transition hover:bg-orange-100/60"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-slate-950">{warning.title}</p>
          <p className="mt-1 text-sm text-slate-600">{warning.text || warning.description}</p>
        </div>

        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-orange-700 ring-1 ring-orange-100">
          {warning.time || "Ny"}
        </span>
      </div>
    </button>
  );
}

function MapLabel({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`absolute rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-slate-600 shadow-sm ring-1 ring-slate-200 ${className}`}
    >
      {children}
    </span>
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
    <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function VehiclePin({
  label,
  status,
  tone = "green",
  selected = false,
}: {
  label: string;
  status: string;
  tone?: string;
  selected?: boolean;
}) {
  const color =
    tone === "orange"
      ? "bg-orange-500"
      : tone === "purple"
      ? "bg-purple-500"
      : tone === "red"
      ? "bg-rose-500"
      : "bg-emerald-500";

  return (
    <button
      type="button"
      className={`absolute rounded-2xl bg-white px-3 py-2 text-left text-xs font-bold text-slate-700 shadow-lg ring-1 ring-slate-200 transition hover:-translate-y-0.5 ${
        selected ? "scale-105 ring-2 ring-teal-500" : ""
      }`}
    >
      <span className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        {label}
      </span>
      <span className="mt-1 block text-[10px] font-semibold text-slate-400">
        {status}
      </span>
    </button>
  );
}

export default function TrafikledningPage() {
  const [activeTab, setActiveTab] = useState<TabId>("live");
  const [showFilter, setShowFilter] = useState(false);

  const activeTabName =
    trafficTabs.find((item) => item.id === activeTab)?.name ?? "Live karta";

  return (
    <div className="min-h-screen bg-[#F5F4F0] flex flex-col">
      <Header />

      <div className="flex flex-1 pt-[60px]">
        <TrafficSideNav activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 ml-[303px] py-8 px-6">
      <div className="mb-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-teal-700 ring-1 ring-teal-100">
              <span className="h-2 w-2 rounded-full bg-teal-500" />
              Drift &amp; trafikledning
            </span>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              Trafikledning
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Kontrollrum för livekarta, körningar, förare, fordon och avvikelser.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("dagens")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <CalendarDaysIcon className="h-5 w-5 text-slate-400" />
              Idag
              <ChevronDownIcon className="h-4 w-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => setShowFilter((value) => !value)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <AdjustmentsHorizontalIcon className="h-5 w-5 text-slate-400" />
              Filter
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("avvikelser")}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              <BellAlertIcon className="h-5 w-5" />
              Varningar
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">3</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mb-5 rounded-[24px] bg-white p-3 shadow-sm ring-1 ring-slate-100">
        <div className="flex gap-2 overflow-x-auto">
          {trafficTabs.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeTab;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={
                  isActive
                    ? "inline-flex shrink-0 items-center gap-2 rounded-2xl bg-teal-700 px-4 py-3 text-sm font-bold text-white shadow-sm"
                    : "inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
                }
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </button>
            );
          })}
        </div>
      </div>

      {showFilter && (
        <div className="mb-5 rounded-[22px] border border-teal-100 bg-teal-50/60 p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-bold text-teal-900">Filter:</span>
            <button className="rounded-full bg-white px-3 py-1.5 font-semibold text-slate-700 shadow-sm ring-1 ring-slate-100">
              Alla körningar
            </button>
            <button className="rounded-full bg-white px-3 py-1.5 font-semibold text-slate-700 shadow-sm ring-1 ring-slate-100">
              Endast förseningar
            </button>
            <button className="rounded-full bg-white px-3 py-1.5 font-semibold text-slate-700 shadow-sm ring-1 ring-slate-100">
              Saknar förare
            </button>
            <button className="rounded-full bg-white px-3 py-1.5 font-semibold text-slate-700 shadow-sm ring-1 ring-slate-100">
              Partnerkörningar
            </button>
          </div>
        </div>
      )}

      <div className="mb-5 grid gap-4 md:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-2 text-3xl font-bold text-slate-950">
                    {item.value}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{item.sub}</p>
                </div>

                <span
                  className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${getToneClasses(
                    item.tone
                  )}`}
                >
                  <Icon className="h-6 w-6" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {activeTab === "live" && <LiveMapView setActiveTab={setActiveTab} />}

      {activeTab === "visualplan" && <VisualPlanView />}

      {activeTab !== "live" && activeTab !== "visualplan" && (
        <ModuleView activeTab={activeTab} activeTabName={activeTabName} />
      )}
            </main>
      </div>
    </div>
  );
}


function TrafficSideNav({
  activeTab,
  setActiveTab,
}: {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
}) {
  return (
    <aside className="fixed left-0 top-[60px] h-[calc(100vh-60px)] w-[303px] overflow-y-auto border-r border-slate-200 bg-white px-4 py-6">
      <div className="mb-5">
        <a
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-100 transition hover:bg-slate-100"
        >
          ← Till portalstart
        </a>

        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Trafikledning
          </p>

          <h2 className="mt-2 text-lg font-bold tracking-tight text-slate-950">
            Kontrollrum
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Livekarta, körningar, resurser och planering.
          </p>
        </div>
      </div>

      <nav className="space-y-1">
        {trafficTabs.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeTab;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={
                isActive
                  ? "flex w-full items-center justify-between gap-3 rounded-xl bg-[#1D2937] px-3 py-2.5 text-left text-sm font-bold text-white shadow-sm"
                  : "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
              }
            >
              <span className="flex min-w-0 items-center gap-3">
                <span
                  className={
                    isActive
                      ? "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/10 text-white"
                      : "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600"
                  }
                >
                  <Icon className="h-5 w-5" />
                </span>

                <span className="truncate">{item.name}</span>
              </span>

              {item.id === "live" && (
                <span
                  className={
                    isActive
                      ? "rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                      : "rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal-700"
                  }
                >
                  Live
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-6 rounded-2xl bg-slate-950 p-4 text-white">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <p className="text-xs font-bold uppercase tracking-wide text-white/50">
            Driftläge
          </p>
        </div>

        <p className="mt-2 text-sm font-bold">
          Trafikledning aktiv
        </p>

        <p className="mt-1 text-xs leading-5 text-white/60">
          9 fordon online, 3 förseningar och 2 avvikelser.
        </p>
      </div>

      <div className="mt-4 rounded-2xl bg-teal-50 p-4 ring-1 ring-teal-100">
        <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
          Nästa steg
        </p>

        <p className="mt-2 text-sm font-bold text-slate-950">
          Koppla körningar
        </p>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          Helsingbuss, Sundra och Flygbuss samlas nu i samma trafikvy.
        </p>
      </div>
    </aside>
  );
}
function LiveMapView({
  setActiveTab,
}: {
  setActiveTab: (tab: TabId) => void;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <div className="relative min-h-[650px] overflow-hidden rounded-[24px] border border-slate-200 bg-[#eef3ef]">
          {/* Hav / kust */}
          <div className="absolute inset-y-0 left-0 w-[18%] bg-gradient-to-r from-sky-200/85 via-sky-100/75 to-transparent" />

          {/* Land / terräng */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_25%,rgba(34,197,94,0.08),transparent_22%),radial-gradient(circle_at_72%_30%,rgba(16,185,129,0.07),transparent_22%),radial-gradient(circle_at_62%_75%,rgba(14,165,233,0.06),transparent_28%),radial-gradient(circle_at_40%_60%,rgba(132,204,22,0.06),transparent_24%)]" />

          {/* Små vägar */}
          <div className="absolute inset-0 opacity-70">
            <div className="absolute left-[8%] top-[24%] h-[2px] w-[72%] rotate-[12deg] rounded-full bg-slate-300/90" />
            <div className="absolute left-[10%] top-[44%] h-[2px] w-[78%] rotate-[3deg] rounded-full bg-slate-300/90" />
            <div className="absolute left-[18%] top-[70%] h-[2px] w-[66%] -rotate-[12deg] rounded-full bg-slate-300/90" />
            <div className="absolute left-[34%] top-[10%] h-[2px] w-[68%] rotate-[79deg] rounded-full bg-slate-300/90" />
            <div className="absolute left-[58%] top-[12%] h-[2px] w-[48%] rotate-[82deg] rounded-full bg-slate-300/90" />
          </div>

          {/* Huvudvägar */}
          <div className="absolute inset-0 opacity-95">
            <div className="absolute left-[18%] top-[47%] h-[4px] w-[62%] rounded-full bg-white shadow-sm ring-1 ring-slate-200" />
            <div className="absolute left-[28%] top-[18%] h-[4px] w-[54%] rotate-[79deg] rounded-full bg-white shadow-sm ring-1 ring-slate-200" />
            <div className="absolute left-[30%] top-[64%] h-[4px] w-[40%] -rotate-[12deg] rounded-full bg-white shadow-sm ring-1 ring-slate-200" />
          </div>

          {/* Rutter */}
          <div className="absolute inset-0">
            <div className="absolute left-[22%] top-[47%] h-[3px] w-[44%] rounded-full border-t-2 border-dashed border-teal-500/80" />
            <div className="absolute left-[55%] top-[49%] h-[3px] w-[18%] -rotate-[14deg] rounded-full border-t-2 border-dashed border-orange-400/85" />
            <div className="absolute left-[42%] top-[58%] h-[3px] w-[34%] rotate-[24deg] rounded-full border-t-2 border-dashed border-purple-400/80" />
          </div>

          {/* Road badges */}
          <div className="absolute left-[30%] top-[40%] rounded-md bg-emerald-700 px-2 py-1 text-[10px] font-bold text-white shadow-sm">
            E6
          </div>
          <div className="absolute left-[44%] top-[28%] rounded-md bg-emerald-700 px-2 py-1 text-[10px] font-bold text-white shadow-sm">
            E4
          </div>
          <div className="absolute left-[60%] top-[51%] rounded-md bg-sky-700 px-2 py-1 text-[10px] font-bold text-white shadow-sm">
            AGH
          </div>
          <div className="absolute left-[68%] top-[77%] rounded-md bg-sky-700 px-2 py-1 text-[10px] font-bold text-white shadow-sm">
            MMX
          </div>

          {/* Toppchips */}
          <div className="absolute left-5 top-5 z-10 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200">
              Nordvästra Skåne live
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-sm ring-1 ring-emerald-100">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              9 online
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700 shadow-sm ring-1 ring-orange-100">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              3 förseningar
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 shadow-sm ring-1 ring-sky-100">
              Flygbussläge
            </span>
          </div>

          {/* Kartkontroller */}
          <div className="absolute right-5 top-5 z-10 overflow-hidden rounded-2xl bg-white/95 shadow-sm ring-1 ring-slate-200">
            <button type="button" className="block h-10 w-10 text-lg font-bold text-slate-700 hover:bg-slate-50">
              +
            </button>
            <button type="button" className="block h-10 w-10 border-t border-slate-100 text-lg font-bold text-slate-700 hover:bg-slate-50">
              −
            </button>
            <button type="button" className="block h-10 w-10 border-t border-slate-100 text-sm font-bold text-slate-500 hover:bg-slate-50">
              ⦿
            </button>
          </div>

          {/* Sidopanel på kartan */}
          <div className="absolute right-5 top-32 z-10 w-56 rounded-2xl bg-white/95 p-3 shadow-sm ring-1 ring-slate-200">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Aktiv rutt
            </p>
            <p className="mt-1 text-sm font-bold text-slate-950">
              811 Flygbuss
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Helsingborg C → Stattena → Ängelholm Station → Ängelholms Flygplats
            </p>

            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-xs font-semibold text-slate-600">ETA AGH</span>
                <span className="text-xs font-bold text-slate-900">10:39</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-xs font-semibold text-slate-600">Status</span>
                <span className="text-xs font-bold text-orange-600">+4 min</span>
              </div>
            </div>
          </div>

          {/* Fordon */}
          <div className="absolute left-[18%] top-[34%] z-10">
            <VehiclePin label="Buss 7" status="I tid" tone="green" />
          </div>

          <div className="absolute left-[42%] top-[39%] z-10">
            <VehiclePin label="Buss 12" status="I tid" tone="green" selected />
          </div>

          <div className="absolute left-[58%] top-[52%] z-10">
            <VehiclePin label="811 Flygbuss" status="+4 min" tone="orange" />
          </div>

          <div className="absolute left-[30%] top-[66%] z-10">
            <VehiclePin label="Buss 3" status="I tid" tone="green" />
          </div>

          <div className="absolute left-[72%] top-[72%] z-10">
            <VehiclePin label="Partner 91" status="Partner" tone="purple" />
          </div>

          {/* Platser */}
          <MapLabel className="left-[12%] top-[45%]">Helsingborg</MapLabel>
          <MapLabel className="left-[18%] top-[18%]">Båstad</MapLabel>
          <MapLabel className="left-[38%] top-[25%]">Ängelholm</MapLabel>
          <MapLabel className="left-[63%] top-[43%]">Ängelholms Flygplats</MapLabel>
          <MapLabel className="left-[27%] top-[43%]">Stattena</MapLabel>
          <MapLabel className="left-[22%] top-[58%]">Råå</MapLabel>
          <MapLabel className="left-[70%] top-[80%]">Malmö Airport</MapLabel>

          {/* Legend */}
          <div className="absolute bottom-5 left-5 z-10 flex flex-wrap gap-2">
            <LegendDot label="I tid" color="bg-emerald-500" />
            <LegendDot label="Försenad" color="bg-orange-500" />
            <LegendDot label="Partnerfordon" color="bg-purple-500" />
            <LegendDot label="Offline" color="bg-slate-400" />
          </div>
        </div>

        <div className="mt-4 rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-50">
                <TruckIcon className="h-7 w-7 text-teal-700" />
              </span>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-950">Buss 12</h2>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                    På väg
                  </span>
                </div>

                <div className="mt-3 grid gap-x-8 gap-y-2 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-3">
                  <p><span className="font-semibold text-slate-900">Förare:</span> Emma Karlsson</p>
                  <p><span className="font-semibold text-slate-900">Körning:</span> 811 Flygbuss</p>
                  <p><span className="font-semibold text-slate-900">Från:</span> Helsingborg C</p>
                  <p><span className="font-semibold text-slate-900">Till:</span> Ängelholms Flygplats</p>
                  <p><span className="font-semibold text-slate-900">Nästa hållplats:</span> Stattena</p>
                  <p><span className="font-semibold text-slate-900">Senast uppdaterad:</span> 10:12</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 xl:justify-end">
              <button
                type="button"
                onClick={() => setActiveTab("korningar")}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-teal-800"
              >
                <DocumentTextIcon className="h-5 w-5" />
                Öppna körorder
              </button>

              <button
                type="button"
                onClick={() => alert("Meddelandefunktion kopplas in senare.")}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <ChatBubbleLeftRightIcon className="h-5 w-5 text-slate-400" />
                Skicka meddelande
              </button>

              <button
                type="button"
                onClick={() => alert("Telefonnummer till förare kopplas in från förarregistret senare.")}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <PhoneIcon className="h-5 w-5 text-slate-400" />
                Ring förare
              </button>
            </div>
          </div>
        </div>
      </section>

      <aside className="space-y-5">
        <Panel title="Aktiva fordon" action="Visa alla" onAction={() => setActiveTab("fordon")}>
          <div className="space-y-3">
            {activeVehicles.map((vehicle) => (
              <button
                key={vehicle.name}
                type="button"
                onClick={() => alert(`${vehicle.name} öppnas som fordonsdetalj senare.`)}
                className="w-full rounded-2xl border border-slate-100 bg-white p-3 text-left transition hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50">
                      <TruckIcon className="h-5 w-5 text-slate-500" />
                    </span>

                    <div>
                      <p className="text-sm font-bold text-slate-950">{vehicle.name}</p>
                      <p className="mt-0.5 text-xs leading-5 text-slate-500">{vehicle.route}</p>
                      <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-slate-600">
                        <span className={`h-2 w-2 rounded-full ${getStatusDot(vehicle.statusTone)}`} />
                        {vehicle.status}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs font-bold text-slate-500">{vehicle.speed}</p>
                </div>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Varningar" action="Visa alla" onAction={() => setActiveTab("avvikelser")}>
          <div className="space-y-3">
            {warnings.map((warning) => (
              <WarningCard key={warning.title} warning={warning} />
            ))}
          </div>
        </Panel>

        <Panel title="Nästa avgångar" action="Visa alla" onAction={() => setActiveTab("dagens")}>
          <div className="space-y-3">
            {departures.map((departure) => (
              <div key={`${departure.time}-${departure.line}`} className="rounded-2xl border border-slate-100 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-950">
                      {departure.time} · {departure.line}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{departure.route}</p>
                  </div>

                  <span
                    className={
                      departure.status.includes("+")
                        ? "rounded-full bg-orange-50 px-2 py-1 text-xs font-bold text-orange-600"
                        : "rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700"
                    }
                  >
                    {departure.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <div className="rounded-[24px] bg-slate-950 p-5 text-white shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-white/50">
                Liveuppdatering
              </p>
              <h3 className="mt-2 text-lg font-bold">GPS aktiv</h3>
            </div>

            <button
              type="button"
              onClick={() => alert("GPS-uppdatering kopplas till databasen senare.")}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 hover:bg-white/15"
            >
              <ArrowPathIcon className="h-6 w-6" />
            </button>
          </div>

          <p className="mt-3 text-sm leading-6 text-white/65">
            Visar testdata just nu. Nästa steg är att koppla riktiga körningar,
            förare, fordon och GPS-positioner från databasen.
          </p>
        </div>
      </aside>
    </div>
  );
}

function ModuleView({
  activeTab,
  activeTabName,
}: {
  activeTab: TabId;
  activeTabName: string;
}) {
  const description: Record<TabId, string> = {
    live: "",
    dagens: "Samlad lista över dagens trafik från Helsingbuss, Sundra och Flygbuss.",
    korningar: "Här samlas körorder, uppdrag, bokningar, offerter och flygbussavgångar som trafikledningen ska hantera.",
    forare: "Här samlas förare, tillgänglighet, bekräftelser och dagens arbetspass.",
    fordon: "Här visas bussar, partnerfordon, GPS-status, platsantal och driftstatus.",
    partners: "Här hanteras underleverantörer, partnerkörningar och bekräftelser.",
    avvikelser: "Här samlas förseningar, kundärenden, problem och trafikledningsnoteringar.",
    historik: "Här kan trafikledningen följa upp tidigare körningar, GPS-historik och replay.",
    visualplan: "",
  };

  return (
    <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-950">{activeTabName}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            {description[activeTab]}
          </p>
        </div>

        {(activeTab === "dagens" || activeTab === "korningar") && (
          <button
            type="button"
            onClick={() => alert("Ny körning ska senare kunna skapas manuellt eller från offert/bokning.")}
            className="inline-flex items-center justify-center rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-800"
          >
            Ny körning
          </button>
        )}
      </div>

      {(activeTab === "dagens" || activeTab === "korningar") ? (
        <DispatchTripsPanel />
      ) : activeTab === "avvikelser" ? (
        <TrafficEventsPanel mode="deviations" />
      ) : activeTab === "historik" ? (
        <TrafficEventsPanel mode="history" />
      ) : activeTab === "forare" ? (
        <TrafficResourcesPanel view="drivers" />
      ) : activeTab === "fordon" ? (
        <TrafficResourcesPanel view="vehicles" />
      ) : activeTab === "partners" ? (
        <TrafficResourcesPanel view="partners" />
      ) : (
        <div className="mt-6 rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-100">
          <p className="text-sm font-semibold text-slate-600">
            Denna vy är förberedd för nästa trafikledningssteg.
          </p>
        </div>
      )}
    </div>
  );
}

function VisualPlanView() {
  return <VisualPlanLivePanel />;
}
function PlanLegend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm ring-1 ring-slate-200">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

