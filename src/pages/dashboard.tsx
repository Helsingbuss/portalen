// src/pages/dashboard.tsx
import {
  ArrowRightIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  MapIcon,
  SparklesIcon,
  TicketIcon,
  UsersIcon,
} from "@heroicons/react/24/solid";
import Layout from "../components/Layout";

export default function Dashboard() {
  return (
    <Layout active="dashboard">
      <div className="mb-7 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
            Helsingbuss Portal
          </span>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Hem
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Översikt över dina Helsingbuss-verktyg och moduler.
          </p>
        </div>

        <div className="hidden md:flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-medium text-slate-500 shadow-sm ring-1 ring-slate-100">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Systemet är redo
        </div>
      </div>

      <div className="w-full rounded-[28px] bg-white/90 p-5 shadow-sm ring-1 ring-slate-100 md:p-7 lg:p-9">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <a
                href="https://login.helsingbuss.se/start"
                target="_blank"
                rel="noopener noreferrer"
                className="group block"
              >
                <div className="relative min-h-[230px] overflow-hidden rounded-[26px] bg-gradient-to-br from-rose-100 via-pink-50 to-violet-100 p-6 shadow-sm ring-1 ring-rose-100 transition duration-200 group-hover:-translate-y-1 group-hover:shadow-xl">
                  <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-rose-300/25 blur-3xl" />
                  <div className="absolute -bottom-16 -left-16 h-44 w-44 rounded-full bg-violet-300/25 blur-3xl" />

                  <div className="relative flex h-full min-h-[180px] flex-col justify-between">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="inline-flex rounded-full bg-white/70 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-rose-600 ring-1 ring-white/70">
                          Huvudportal
                        </span>

                        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">
                          Helsingbuss Booking
                        </h2>

                        <p className="mt-2 max-w-[300px] text-sm leading-6 text-slate-600">
                          Order, offerter och bokningar samlade på ett tydligt
                          ställe.
                        </p>
                      </div>

                      <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/75 shadow-md ring-1 ring-white/70 transition group-hover:scale-105 md:flex">
                        <ClipboardDocumentListIcon className="h-8 w-8 text-rose-500" />
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">
                        Öppna bokningsportal
                      </span>
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-white transition group-hover:translate-x-1">
                        <ArrowRightIcon className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </div>
              </a>

              <a href="/trafikledning" className="group block">
                <div className="relative min-h-[230px] overflow-hidden rounded-[26px] bg-gradient-to-br from-cyan-100 via-teal-50 to-emerald-100 p-6 shadow-sm ring-1 ring-teal-100 transition duration-200 group-hover:-translate-y-1 group-hover:shadow-xl">
                  <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-teal-300/25 blur-3xl" />
                  <div className="absolute -bottom-16 -left-16 h-44 w-44 rounded-full bg-cyan-300/25 blur-3xl" />

                  <div className="relative flex h-full min-h-[180px] flex-col justify-between">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="inline-flex rounded-full bg-white/70 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-teal-700 ring-1 ring-white/70">
                          Drift &amp; trafikledning
                        </span>

                        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">
                          Helsingbuss Trafikledning
                        </h2>

                        <p className="mt-2 max-w-[320px] text-sm leading-6 text-slate-600">
                          Livekarta, körningar, förare, fordon och avvikelser i
                          realtid.
                        </p>
                      </div>

                      <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/75 shadow-md ring-1 ring-white/70 transition group-hover:scale-105 md:flex">
                        <MapIcon className="h-8 w-8 text-teal-600" />
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">
                        Öppna kontrollrum
                      </span>
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-teal-700 text-white transition group-hover:translate-x-1">
                        <ArrowRightIcon className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </div>
              </a>
            </div>

            <a
              href="/paketresor"
              className="group flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/80 px-5 py-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100">
                  <TicketIcon className="h-6 w-6 text-rose-500" />
                </span>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-950">
                      Helsingbuss Paketresor
                    </h3>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 ring-1 ring-slate-200">
                      Resor
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Biljetter, avgångar och biljettpriser till paketresor.
                  </p>
                </div>
              </div>

              <ArrowRightIcon className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-700" />
            </a>
          </div>

          <aside className="lg:col-span-1 lg:border-l lg:border-slate-100 lg:pl-7">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Moduler &amp; appar
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Snabb åtkomst till viktiga verktyg.
                </p>
              </div>

              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-400 ring-1 ring-slate-100">
                <SparklesIcon className="h-5 w-5" />
              </span>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                className="group w-full rounded-2xl border border-slate-100 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-rose-100 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50">
                      <UsersIcon className="h-5 w-5 text-rose-500" />
                    </span>

                    <div>
                      <div className="text-sm font-bold text-slate-950">
                        Helsingbuss CrewCenter
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Chaufförregister och bokningsagenter.
                      </p>
                    </div>
                  </div>

                  <ArrowRightIcon className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-700" />
                </div>
              </button>

              <button
                type="button"
                className="group w-full rounded-2xl border border-slate-100 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-emerald-100 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50">
                      <BanknotesIcon className="h-5 w-5 text-emerald-500" />
                    </span>

                    <div>
                      <div className="text-sm font-bold text-slate-950">
                        Helsingbuss PriceBoard
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Hantera priser, prislistor och kampanjer.
                      </p>
                    </div>
                  </div>

                  <ArrowRightIcon className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-700" />
                </div>
              </button>

              <button
                type="button"
                className="group w-full rounded-2xl border border-slate-100 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-orange-100 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50">
                      <ClipboardDocumentListIcon className="h-5 w-5 text-orange-500" />
                    </span>

                    <div>
                      <div className="text-sm font-bold text-slate-950">
                        Helsingbuss Lejmodul
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Ta emot offerter från samarbetspartners.
                      </p>
                    </div>
                  </div>

                  <ArrowRightIcon className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-700" />
                </div>
              </button>

              <button
                type="button"
                className="group w-full rounded-2xl border border-slate-100 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-indigo-100 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50">
                      <ChartBarIcon className="h-5 w-5 text-indigo-500" />
                    </span>

                    <div>
                      <div className="text-sm font-bold text-slate-950">
                        Trafivo Reports
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Journalföring, rapporter och uppföljning.
                      </p>
                    </div>
                  </div>

                  <ArrowRightIcon className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-700" />
                </div>
              </button>

              <button
                type="button"
                className="group w-full rounded-2xl border border-slate-100 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-purple-100 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-50">
                      <CalendarDaysIcon className="h-5 w-5 text-purple-500" />
                    </span>

                    <div>
                      <div className="text-sm font-bold text-slate-950">
                        Helsingbuss Schedule
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Linjebussmodul, schema och avgångar.
                      </p>
                    </div>
                  </div>

                  <ArrowRightIcon className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-700" />
                </div>
              </button>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}