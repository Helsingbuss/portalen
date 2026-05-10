// src/pages/admin/sundra/index.tsx
import React from "react";
import Link from "next/link";
import { Topbar } from "@/components/sundra/Topbar";
import { Sidebar } from "@/components/sundra/Sidebar";

function Card({
  title,
  desc,
  href,
  cta = "Öppna →",
}: {
  title: string;
  desc: string;
  href: string;
  cta?: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md"
    >
      <div className="text-sm font-semibold text-gray-900">{title}</div>
      <div className="mt-1 text-sm text-gray-600">{desc}</div>
      <div className="mt-4 text-sm font-semibold" style={{ color: "var(--hb-accent)" }}>
        {cta}
      </div>
    </Link>
  );
}

export default function AdminSundraDashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Din snygga topbar med logo etc */}
      <Topbar />

      {/* Sidebar (fixad) */}
      <Sidebar />

      {/* Content */}
      <main className="px-6 pb-16 pt-20 md:pl-72">
        <div className="mx-auto max-w-[1100px]">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">
              Översikt för admin. Resor, avgångar och bokningar ligger som egna menyer i sidomenyn.
            </p>
          </div>

          {/* Snabbknappar */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card
              title="Resor"
              desc="Skapa, redigera och publicera resor."
              href="/admin/sundra/resor"
            />
            <Card
              title="Avgångar"
              desc="Lägg upp datum, tid, operatör och platser per resa. (Nästa steg vi bygger)"
              href="/admin/sundra/avgangar"
              cta="Gå till Avgångar →"
            />
            <Card
              title="Bokningar"
              desc="Se bokningar, hantera kunder och betalningar. (kommer i nästa etapper)"
              href="/admin/sundra/bokningar"
              cta="Öppna (kommer) →"
            />
          </div>

          {/* Status / plan */}
          <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold text-gray-900">Vad vi bygger härnäst</div>
            <div className="mt-2 space-y-2 text-sm text-gray-700">
              <div>
                <span className="font-semibold">1)</span> Admin/Agent dashboards fungerar (du är här).
              </div>
              <div>
                <span className="font-semibold">2)</span> Admin-sida för <span className="font-semibold">Avgångar</span>{" "}
                (datum, tid, operatör, platser) kopplat till resa – obegränsat antal.
              </div>
              <div>
                <span className="font-semibold">3)</span> Priser/biljettyper efter avgångar.
              </div>
              <div>
                <span className="font-semibold">4)</span> Publik <span className="font-semibold">Boka-sida</span>{" "}
                (avgångar + priser visas där – inte på resesidan).
              </div>
            </div>
          </div>

          {/* Länkar som du ofta behöver */}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold text-gray-900">Snabbt</div>
              <div className="mt-3 space-y-2 text-sm">
                <Link className="block hover:underline" href="/admin/sundra/resor/ny">
                  + Skapa resa (resmall)
                </Link>
                <Link className="block hover:underline" href="/admin/sundra/resor">
                  Lista resor
                </Link>
                <Link className="block hover:underline" href="/admin/sundra/avgangar">
                  Alla avgångar (vi bygger nu)
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold text-gray-900">Notering</div>
              <p className="mt-2 text-sm text-gray-700">
                Den här dashboarden ersätter din gamla redirect. Resor-sidorna är kvar exakt som innan.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


