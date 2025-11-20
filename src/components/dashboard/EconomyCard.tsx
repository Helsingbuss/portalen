// src/components/dashboard/EconomyCard.tsx
import React, { useMemo } from "react";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import type { StatsTotals } from "./OffersBarChart";

type Props = {
  from: string;            // YYYY-MM-DD
  to: string;              // YYYY-MM-DD
  totals?: StatsTotals;    // totals från /api/dashboard/series
  loading?: boolean;
  heightClass?: string;    // t.ex. "h-[420px]"
};

const ZERO_TOTALS: StatsTotals = {
  offer_answered_count: 0,
  offer_answered_amount: 0,
  offer_approved_count: 0,
  offer_approved_amount: 0,
  booking_booked_count: 0,
  booking_booked_amount: 0,
  booking_done_count: 0,
  booking_done_amount: 0,
};

const formatAmount = (value: number) =>
  value.toLocaleString("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function EconomyCard({
  from,
  to,
  totals,
  loading = false,
  heightClass = "h-[420px]",
}: Props) {
  const t = totals ?? ZERO_TOTALS;

  // 🔹 Data för kortet
  const soldTickets = t.booking_done_count;          // "sålda biljetter"
  const bookedCount = t.booking_booked_count;        // antal bokade
  const revenue = t.booking_done_amount;             // intäkter (genomförda)

  const bars = useMemo(() => {
    const values = [soldTickets, bookedCount, revenue];
    const max = Math.max(1, ...values);

    return [
      {
        key: "tickets",
        label: "Sålda biljetter",
        color: "#2E7D32",
        value: soldTickets,
        ratio: soldTickets / max,
      },
      {
        key: "booked",
        label: "Antal bokade",
        color: "#60A5FA",
        value: bookedCount,
        ratio: bookedCount / max,
      },
      {
        key: "revenue",
        label: "Intäkter",
        color: "#14532D",
        value: revenue,
        ratio: revenue / max,
      },
    ];
  }, [soldTickets, bookedCount, revenue]);

  const rangeLabel = `${from} – ${to}`;

  return (
    <div
      className={`bg-white rounded-xl shadow px-5 py-4 flex flex-col ${heightClass}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-[#194C66] font-semibold text-lg">
            Sålda biljetter, antal bokade och intäkter
          </h2>
          <p className="text-xs text-[#6B7280] mt-1">{rangeLabel}</p>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-gray-600 hover:bg-gray-50"
          aria-label="Filter för period"
        >
          <AdjustmentsHorizontalIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Innehåll */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-[#194C66]/70">
          Laddar…
        </div>
      ) : (
        <>
          {/* Stapeldiagram */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 flex items-end justify-between gap-4 border-b border-dashed border-gray-200 pb-4">
              {bars.map((b) => {
                const h = 40 + b.ratio * 110; // visuell höjd
                return (
                  <div
                    key={b.key}
                    className="flex flex-col items-center justify-end flex-1"
                  >
                    <div
                      className="w-10 rounded-t-md"
                      style={{
                        height: `${h}px`,
                        backgroundColor: b.color,
                      }}
                    />
                    <span className="mt-2 text-xs text-[#6B7280] text-center leading-tight">
                      {b.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Sammanfattning under grafen */}
            <dl className="mt-4 space-y-1 text-sm">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-[#194C66]">Sålda biljetter</dt>
                <dd className="font-semibold text-[#2E7D32]">
                  {soldTickets.toLocaleString("sv-SE")}
                </dd>
              </div>

              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-[#194C66]">Antal bokade</dt>
                <dd className="font-semibold text-[#1D4ED8]">
                  {bookedCount.toLocaleString("sv-SE")}
                </dd>
              </div>

              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-[#194C66]">Intäkter</dt>
                <dd className="font-semibold text-[#14532D]">
                  {formatAmount(revenue)} SEK
                </dd>
              </div>
            </dl>
          </div>
        </>
      )}
    </div>
  );
}
