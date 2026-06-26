// src/components/Layout.tsx
import React, { ReactNode } from "react";
import Link from "next/link";
import Header from "./Header";
import {
  BuildingOfficeIcon,
  HomeIcon,
  MapIcon,
  TicketIcon,
  UserCircleIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

interface LayoutProps {
  children: ReactNode;
  active: string;
}

export default function Layout({ children, active }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[#F5F4F0] flex flex-col">
      <Header />

      <div className="flex flex-1 pt-[60px]">
        <aside className="fixed top-[60px] left-0 w-[303px] h-[calc(100vh-60px)] bg-white border-r border-slate-200 px-4 py-6 overflow-y-auto">
          <div className="mb-6">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Navigering
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Helsingbuss Portal
            </p>
          </div>

          <nav className="space-y-6">
            <div className="space-y-1">
              <SidebarLink
                href="/dashboard"
                label="Hem"
                active={active === "dashboard"}
                icon={<HomeIcon className="h-5 w-5" />}
              />

              <SidebarLink
                href="/trafikledning"
                label="Trafikledning"
                active={active === "trafikledning"}
                icon={<MapIcon className="h-5 w-5" />}
                badge="Live"
              />

              <SidebarLink
                href="/tickets"
                label="Paketresor"
                active={active === "tickets"}
                icon={<TicketIcon className="h-5 w-5" />}
              />
            </div>

            <div>
              <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Administration
              </p>

              <div className="space-y-1">
                <SidebarLink
                  href="/profile"
                  label="Min användarprofil"
                  active={active === "profile"}
                  icon={<UserCircleIcon className="h-5 w-5" />}
                />

                <SidebarLink
                  href="/company"
                  label="Företagsinställningar"
                  active={active === "company"}
                  icon={<BuildingOfficeIcon className="h-5 w-5" />}
                />

                <SidebarLink
                  href="/users"
                  label="Hantera användare"
                  active={active === "users"}
                  icon={<UsersIcon className="h-5 w-5" />}
                />
              </div>
            </div>
          </nav>

          <div className="mt-8 rounded-2xl bg-slate-950 p-4 text-white">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <p className="text-xs font-bold uppercase tracking-wide text-white/60">
                Driftläge
              </p>
            </div>

            <p className="mt-2 text-sm font-bold">
              Trafikledning redo
            </p>

            <p className="mt-1 text-xs leading-5 text-white/60">
              Livekarta, körningar och VisualPlan samlas här.
            </p>
          </div>
        </aside>

        <main className="flex-1 ml-[303px] py-10 px-6">{children}</main>
      </div>
    </div>
  );
}

type SidebarLinkProps = {
  href: string;
  label: string;
  active: boolean;
  icon: ReactNode;
  badge?: string;
};

function SidebarLink({ href, label, active, icon, badge }: SidebarLinkProps) {
  return (
    <Link
      href={href}
      className={`group flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition
      ${
        active
          ? "bg-[#1D2937] text-white shadow-sm"
          : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
      }`}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span
          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition
          ${
            active
              ? "border-white/40 bg-white/10 text-white"
              : "border-slate-200 bg-slate-50 text-slate-600 group-hover:border-slate-300"
          }`}
        >
          {icon}
        </span>

        <span className="truncate">{label}</span>
      </span>

      {badge && (
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide
          ${
            active
              ? "bg-white/15 text-white"
              : "bg-teal-50 text-teal-700"
          }`}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}