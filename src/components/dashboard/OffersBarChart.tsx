// src/components/dashboard/OffersBarChart.tsx
import React, { useMemo } from "react";

export type Series = {
  weeks: string[];
  offer_answered: number[];
  offer_unanswered: number[];
  booking_in: number[];
  booking_done: number[];
  // 🔥 NYTT (valfritt från API)
  offer_declined?: number[];
};

export type StatsTotals = {
  offer_answered_count: number;
  offer_answered_amount: number | string;
  offer_approved_count: number;
  offer_approved_amount: number | string;
  booking_booked_count: number;
  booking_booked_amount: number | string;
  booking_done_count: number;
  booking_done_amount: number | string;

  tickets_count?: number;
  tickets_amount?: number | string;
};

type Props = {
  series: Series;
  totals?: StatsTotals;
};

const formatKr = (v: any) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(Number(v || 0));

export default function OffersBarChart({ series, totals }: Props) {
  const weeks = series.weeks || [];

  const MAX_POINTS = 12;

  const visibleWeeks =
    weeks.length > MAX_POINTS
      ? weeks.slice(-MAX_POINTS)
      : weeks;

  // 🔥 FILTRERA BORT AVBÖJDA (om finns)
  const visibleSeries = {
    offer_answered: series.offer_answered.slice(-visibleWeeks.length),
    offer_unanswered: series.offer_unanswered
      .slice(-visibleWeeks.length)
      .map((v, i) => {
        const declined = series.offer_declined?.slice(-visibleWeeks.length)[i] ?? 0;
        return Math.max(0, v - declined); // tar bort avböjda från obesvarade
      }),
    booking_in: series.booking_in.slice(-visibleWeeks.length),
    booking_done: series.booking_done.slice(-visibleWeeks.length),
  };

  const safe = (arr: number[] | undefined, i: number) =>
    (arr && arr[i]) ?? 0;

  const maxY = useMemo(() => {
    return Math.max(
      1,
      ...visibleSeries.offer_answered,
      ...visibleSeries.offer_unanswered,
      ...visibleSeries.booking_in,
      ...visibleSeries.booking_done
    );
  }, [visibleSeries]);

  return (
    <div className="px-2 py-2 overflow-hidden">

      {/* KPI */}
      <div className="flex justify-between items-center mb-3">
        <KPI label="Biljetter" value={totals?.tickets_count ?? 0} color="text-green-600" />
        <KPI label="Bokningar" value={totals?.booking_booked_count} color="text-red-600" />
        <KPI label="Offerter" value={totals?.offer_answered_count} color="text-blue-600" />
      </div>

      {/* GRAF */}
      <div className="flex items-end justify-between h-[170px] gap-1">

        {visibleWeeks.map((w: string, i: number) => {
          const values = [
            safe(visibleSeries.booking_done, i),
            safe(visibleSeries.booking_in, i),
            safe(visibleSeries.offer_answered, i),
            safe(visibleSeries.offer_unanswered, i),
          ];

          return (
            <div key={i} className="flex flex-col items-center flex-1 min-w-0">

              <div className="flex items-end gap-[3px]">
                {values.map((v, j) => {
                  const h = Math.min((v / maxY) * 150, 150);

                  return (
                    <div
                      key={j}
                      className="w-[6px] rounded-sm transition-all duration-200 hover:opacity-80"
                      style={{
                        height: `${h}px`,
                        backgroundColor:
                          j === 0
                            ? "#16a34a"
                            : j === 1
                            ? "#dc2626"
                            : j === 2
                            ? "#2563eb"
                            : "#bfdbfe",
                      }}
                    />
                  );
                })}
              </div>

              <span className="text-[10px] text-gray-400 mt-1 truncate max-w-[40px] text-center">
                {w}
              </span>
            </div>
          );
        })}
      </div>

      {/* FOOTER */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">

        <div className="flex justify-between">
          <span className="text-gray-400">Offerter</span>
          <span className="font-medium">{totals?.offer_answered_count} st</span>
        </div>
        <div className="text-right font-medium text-[#194C66]">
          {formatKr(totals?.offer_answered_amount)} kr
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Bokningar</span>
          <span className="font-medium">{totals?.booking_done_count} st</span>
        </div>
        <div className="text-right font-medium text-[#194C66]">
          {formatKr(totals?.booking_done_amount)} kr
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400">Biljetter</span>
          <span className="font-medium">{totals?.tickets_count ?? 0} st</span>
        </div>
        <div className="text-right font-medium text-[#194C66]">
          {formatKr(totals?.tickets_amount ?? 0)} kr
        </div>

      </div>
    </div>
  );
}

function KPI({ label, value, color }: any) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] text-gray-400">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>
        {value ?? 0}
      </span>
    </div>
  );
}
