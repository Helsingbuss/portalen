// src/components/offers/OfferTopBar.tsx
import Image from "next/image";
import { useState } from "react";

type Props = {
  /** Ex. HB25PREVIEW – visas inte i mobilen (bara desktop). */
  offerNumber?: string;
  /** Kundnummer – visas i både desktop och mobil. */
  customerNumber?: string;
  /** Kundens namn – visas i toppraden (desktop: full, mobil: kompakt). */
  customerName?: string;
  /** Status för offerten (Inkommen/Besvarad/Godkänd/…); valfri chip till höger om loggan (desktop). */
  status?: string;
};

export default function OfferTopBar({
  offerNumber,
  customerNumber = "",
  customerName = "Kund",
  status,
}: Props) {
  const [openBell, setOpenBell] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#1D2937] text-white shadow-sm">
      {/* Inre rad: responsiv padding – mindre i mobil, större i desktop */}
      <div className="w-full px-3 sm:px-4 lg:px-6">
        <div className="h-12 sm:h-14 lg:h-16 flex items-center justify-between gap-3">
          {/* Vänster: vit logotyp – kompakt i mobil */}
          <div className="flex items-center min-w-0">
            <Image
              src="/vit_logo.png"
              alt="Helsingbuss"
              width={150}
              height={28}
              priority
              className="block lg:hidden"
            />
            <Image
              src="/vit_logo.png"
              alt="Helsingbuss"
              width={185}
              height={34}
              priority
              className="hidden lg:block"
            />

            {/* Desktop: ev. status-chip bredvid loggan */}
            {status && (
              <span className="ml-3 hidden sm:inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                {status}
              </span>
            )}
          </div>

          {/* Höger: actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* “Guida mig” – komprimerad i mobil, full i desktop */}
            <button
              type="button"
              className="rounded-md border border-white/30 px-3 sm:px-3.5 py-1.5 text-xs sm:text-sm hover:bg-white/10 transition"
            >
              Guida mig
            </button>

            {/* Klocka / notifieringar */}
            <div className="relative">
              <button
                type="button"
                aria-label="Notifieringar"
                className="relative inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 transition"
                onClick={() => setOpenBell((v) => !v)}
              >
                {/* enkel klock-ikon (svg) */}
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.054-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                {/* litet dot-badge (kan kopplas mot count senare) */}
                <span className="absolute -top-0.5 -right-0.5 inline-flex h-2 w-2 rounded-full bg-rose-400 ring-2 ring-[#1D2937]" />
              </button>

              {/* Dropdown – enkel/kompakt */}
              {openBell && (
                <div className="absolute right-0 mt-2 w-64 rounded-lg border border-white/15 bg-[#101827] p-3 text-sm shadow-xl">
                  <div className="font-medium mb-2">Notifieringar</div>
                  <div className="text-white/70">Det finns inga notifieringar.</div>
                </div>
              )}
            </div>

            {/* Kundinfo: kompakt i mobil, full på desktop */}
            <div className="flex items-center gap-2">
              <div className="text-right leading-tight">
                {/* Desktop: namn + liten rad med kundnr */}
                <div className="hidden sm:block">
                  <div className="text-sm font-medium truncate max-w-[32ch]">
                    Kund: {customerName}
                  </div>
                  {customerNumber && (
                    <div className="text-[11px] text-white/70">{customerNumber}</div>
                  )}
                </div>

                {/* Mobil: två rader – “Kund” + kundnr. Namn blir för långt i små skärmar. */}
                <div className="sm:hidden">
                  <div className="text-[13px] font-medium">Kund</div>
                  {customerNumber && (
                    <div className="text-[11px] text-white/70">{customerNumber}</div>
                  )}
                </div>
              </div>

              {/* Liten chevron – bara dekorativ här */}
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 opacity-80"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
