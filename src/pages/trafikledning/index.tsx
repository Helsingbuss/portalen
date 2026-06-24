// src/pages/trafikledning/index.tsx
import {
  AdjustmentsHorizontalIcon,
  BellAlertIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  MapIcon,
  TruckIcon,
  UserGroupIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import Layout from "../../components/Layout";

const trafficTabs = [
  { name: "Live karta", active: true, icon: MapIcon },
  { name: "Dagens trafik", active: false, icon: ClockIcon },
  { name: "Körningar", active: false, icon: TruckIcon },
  { name: "Förare", active: false, icon: UsersIcon },
  { name: "Fordon", active: false, icon: TruckIcon },
  { name: "Partners", active: false, icon: UserGroupIcon },
  { name: "Avvikelser", active: false, icon: ExclamationTriangleIcon },
];

export default function TrafikledningPage() {
  return (
    <Layout active="dashboard">
      <div className="mb-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-teal-700 ring-1 ring-teal-100">
              <span className="h-2 w-2 rounded-full bg-teal-500" />
              Drift & trafikledning
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
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <CalendarDaysIcon className="h-5 w-5 text-slate-400" />
              Idag
              <ChevronDownIcon className="h-4 w-4 text-slate-400" />
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <AdjustmentsHorizontalIcon className="h-5 w-5 text-slate-400" />
              Filter
            </button>

            <button
              type="button"
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

            return (
              <button
                key={item.name}
                type="button"
                className={
                  item.active
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

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Pågående körningar
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-950">0</p>
            </div>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50">
              <TruckIcon className="h-6 w-6 text-teal-700" />
            </span>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Fordon online
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-950">0</p>
            </div>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
              <MapIcon className="h-6 w-6 text-emerald-600" />
            </span>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Förseningar
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-950">0</p>
            </div>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50">
              <ClockIcon className="h-6 w-6 text-orange-500" />
            </span>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Avvikelser
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-950">0</p>
            </div>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50">
              <ExclamationTriangleIcon className="h-6 w-6 text-rose-500" />
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50">
          <div className="max-w-md text-center">
            <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-teal-50">
              <MapIcon className="h-8 w-8 text-teal-700" />
            </span>

            <h2 className="mt-4 text-lg font-bold text-slate-950">
              Live GPS-karta kommer här
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Nästa steg blir att lägga in kartvy, fordon, aktiva körningar,
              statuspanel och varningar i realtid.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}