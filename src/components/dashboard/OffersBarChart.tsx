// src/components/dashboard/OffersBarChart.tsx
import React, { useMemo, useState } from "react";

export type Series = {
  weeks: string[];
  offer_answered: number[];
  offer_unanswered: number[];
  booking_in: number[];
  booking_done: number[];
};

export type StatsTotals = {
  offer_answered_count: number;
  offer_answered_amount: number;
  offer_approved_count: number;
  offer_approved_amount: number;
  booking_booked_count: number;
  booking_booked_amount: number;
  booking_done_count: number;
  booking_done_amount: number;
};

type Props = {
  series: Series;
  totals?: StatsTotals; // 👈 nya totals från API
};

// Veckorna låsta enligt din skiss
const FIXED_WEEKS = ["46", "47", "48", "49", "50", "51", "52", "1"];

const COLORS = {
  offer_answered: "#2E7D32", // grön
  offer_unanswered: "#A5D6A7", // ljusgrön
  booking_in: "#C62828", // röd
  booking_done: "#F48FB1", // rosa (antal sålda biljetter)
};

const LABELS: Record<keyof Series, string> = {
  weeks: "Vecka",
  offer_answered: "Besvarade offerter",
  offer_unanswered: "Obesvarade offerter",
  booking_in: "Inkomna bokningar",
  booking_done: "Antal sålda biljetter",
};

function buildTicks(max: number): number[] {
  const ceilMax = Math.max(1, Math.ceil(max));
  if (ceilMax <= 6) return Array.from({ length: ceilMax + 1 }, (_, i) => i);
  const step = Math.ceil(ceilMax / 6);
  const arr: number[] = [];
  for (let v = 0; v <= ceilMax; v += step) arr.push(v);
  if (arr[arr.length - 1] !== ceilMax) arr.push(ceilMax);
  return arr;
}

type Tip = {
  anchorX: number;
  anchorY: number;
  boxX: number;
  boxY: number;
  label: string;
  value: number;
};

// Fyll upp data så vi alltid har värden för veckorna 46–52,1
function padToWeeks(source?: number[]): number[] {
  const arr = source ?? [];
  return FIXED_WEEKS.map((_, i) => arr[i] ?? 0);
}

const formatAmount = (value: number) =>
  value.toLocaleString("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function OffersBarChart({ series, totals }: Props) {
  // 🔹 Stapel-data (alltid veckor 46-52,1 visuellt)
  const weeks = FIXED_WEEKS;
  const offerAnswered = padToWeeks(series.offer_answered);
  const offerUnanswered = padToWeeks(series.offer_unanswered);
  const bookingIn = padToWeeks(series.booking_in);
  const bookingDone = padToWeeks(series.booking_done);

  // 🔹 Max Y för diagrammet
  const maxY = useMemo(
    () =>
      Math.max(
        1,
        ...(offerAnswered.length ? offerAnswered : [0]),
        ...(offerUnanswered.length ? offerUnanswered : [0]),
        ...(bookingIn.length ? bookingIn : [0]),
        ...(bookingDone.length ? bookingDone : [0])
      ),
    [offerAnswered, offerUnanswered, bookingIn, bookingDone]
  );
  const ticks = useMemo(() => buildTicks(maxY), [maxY]);

  // 🔹 Totala antal från staplar (fallback om totals saknas)
  const countFromSeries = useMemo(
    () => ({
      offer_answered: offerAnswered.reduce((a, b) => a + b, 0),
      offer_unanswered: offerUnanswered.reduce((a, b) => a + b, 0),
      booking_in: bookingIn.reduce((a, b) => a + b, 0),
      booking_done: bookingDone.reduce((a, b) => a + b, 0),
    }),
    [offerAnswered, offerUnanswered, bookingIn, bookingDone]
  );

  // 🔹 Riktiga totals från API (med fallback)
  const answeredCount =
    totals?.offer_answered_count ?? countFromSeries.offer_answered;
  const approvedCount = totals?.offer_approved_count ?? 0;

  const bookedCount =
    totals?.booking_booked_count ?? countFromSeries.booking_in;
  const doneCount =
    totals?.booking_done_count ?? countFromSeries.booking_done;

  const amountTotals = {
    offers_answered: totals?.offer_answered_amount ?? 0,
    offers_approved: totals?.offer_approved_amount ?? 0,
    bookings_booked: totals?.booking_booked_amount ?? 0,
    bookings_done: totals?.booking_done_amount ?? 0,
    tickets_sold: 0, // vi har ingen ticket-tabell ännu
  };

  // SVG layout
  const height = 260;
  const topPad = 20;
  const bottomPad = 36;
  const leftPad = 28;
  const rightPad = 12;
  const innerH = height - topPad - bottomPad;
  const innerW = Math.max(weeks.length * 56, 400);
  const svgW = innerW + leftPad + rightPad;

  const barWidth = 14;
  const barGap = 6;
  const groupWidth = barWidth * 4 + barGap * 3;
  const y = (val: number) =>
    topPad + innerH * (1 - val / ticks[ticks.length - 1]);

  const [tip, setTip] = useState<null | Tip>(null);

  function placeTooltip(
    anchorX: number,
    anchorY: number,
    label: string,
    value: number
  ): Tip {
    const boxW = 160;
    const boxH = 28;
    const gap = 10;
    let boxX = anchorX + gap;
    if (boxX + boxW > svgW - 4) boxX = anchorX - gap - boxW;
    let boxY = anchorY - boxH / 2;
    const minY = topPad + 2;
    const maxYpx = height - bottomPad - boxH - 2;
    if (boxY < minY) boxY = minY;
    if (boxY > maxYpx) boxY = maxYpx;
    return { anchorX, anchorY, boxX, boxY, label, value };
  }

  const groups = weeks.map((w, i) => ({
    week: w,
    gx: leftPad + i * groupWidth + i * 12,
  }));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2.1fr)_minmax(260px,0.9fr)] gap-6">
      {/* VÄNSTER: DIAGRAMMET */}
      <div className="relative w-full overflow-x-auto">
        <svg width={svgW} height={height} className="block">
          {/* Horisontella linjer + Y-etiketter */}
          {ticks.map((value, i) => {
            const yPos = y(value);
            return (
              <g key={`grid-${i}`}>
                <line
                  x1={leftPad}
                  x2={leftPad + innerW}
                  y1={yPos}
                  y2={yPos}
                  stroke="#E5E7EB"
                />
                <text
                  x={leftPad - 7}
                  y={yPos + 4}
                  textAnchor="end"
                  fill="#6B7280"
                  fontSize="10"
                >
                  {value}
                </text>
              </g>
            );
          })}

          {/* Stapelgrupper per vecka */}
          {groups.map(({ week, gx }, i) => {
            const bars = [
              {
                v: bookingDone[i] || 0,
                c: COLORS.booking_done,
                key: "booking_done" as const,
              },
              {
                v: bookingIn[i] || 0,
                c: COLORS.booking_in,
                key: "booking_in" as const,
              },
              {
                v: offerAnswered[i] || 0,
                c: COLORS.offer_answered,
                key: "offer_answered" as const,
              },
              {
                v: offerUnanswered[i] || 0,
                c: COLORS.offer_unanswered,
                key: "offer_unanswered" as const,
              },
            ];

            return (
              <g key={`grp-${i}`}>
                {bars.map((b, j) => {
                  const h = innerH * (b.v / ticks[ticks.length - 1]);
                  const x = gx + j * (barWidth + barGap);
                  const yTop = topPad + (innerH - h);
                  const cx = x + barWidth / 2;
                  const cy = yTop + h / 2;

                  return (
                    <rect
                      key={b.key}
                      x={x}
                      y={yTop}
                      width={barWidth}
                      height={Math.max(h, 0)}
                      fill={b.c}
                      rx={3}
                      onMouseEnter={() =>
                        setTip(
                          placeTooltip(cx, cy, LABELS[b.key], b.v ?? 0)
                        )
                      }
                      onMouseMove={() =>
                        setTip(
                          placeTooltip(cx, cy, LABELS[b.key], b.v ?? 0)
                        )
                      }
                      onMouseLeave={() => setTip(null)}
                    />
                  );
                })}

                {/* Veckonummer 46, 47, 48, 49, 50, 51, 52, 1 */}
                <text
                  x={gx + groupWidth / 2}
                  y={height - 10}
                  textAnchor="middle"
                  fill="#6B7280"
                  fontSize="11"
                >
                  {week}
                </text>
              </g>
            );
          })}

          {/* Tooltip */}
          {tip && (
            <g pointerEvents="none">
              <path
                d={`M ${tip.anchorX} ${tip.anchorY} L ${
                  tip.boxX < tip.anchorX ? tip.anchorX - 6 : tip.anchorX + 6
                } ${tip.anchorY - 6} L ${
                  tip.boxX < tip.anchorX ? tip.anchorX - 6 : tip.anchorX + 6
                } ${tip.anchorY + 6} Z`}
                fill="white"
                stroke="#E5E7EB"
              />
              <rect
                x={tip.boxX}
                y={tip.boxY}
                width={160}
                height={28}
                fill="white"
                stroke="#E5E7EB"
                rx={6}
              />
              <text
                x={tip.boxX + 80}
                y={tip.boxY + 18}
                textAnchor="middle"
                fontSize="11"
                fill="#111827"
              >
                {tip.label}: {tip.value}
              </text>
            </g>
          )}
        </svg>

        {/* Legend – som i din skiss */}
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <LegendDot
            color={COLORS.offer_answered}
            label="Besvarade offerter"
          />
          <LegendDot
            color={COLORS.offer_unanswered}
            label="Obesvarade offerter"
          />
          <LegendDot
            color={COLORS.booking_in}
            label="Inkomna bokningar"
          />
          <LegendDot
            color={COLORS.booking_done}
            label="Antal sålda biljetter"
          />
        </div>
      </div>

      {/* HÖGER: OFFERTER / BOKNINGAR / BILJETTER – enligt bilden */}
      <div className="flex flex-col justify-start text-sm text-[#111827]">
        {/* Offerter */}
        <div className="mb-8">
          <div className="font-semibold text-base mb-2">Offerter</div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-1">
            <div>
              <div className="text-xs text-[#6B7280]">
                Besvarade, {answeredCount} st
              </div>
              <div className="text-lg font-semibold">
                {formatAmount(amountTotals.offers_answered)}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#6B7280]">
                Godkända, {approvedCount} st
              </div>
              <div className="text-lg font-semibold">
                {formatAmount(amountTotals.offers_approved)}
              </div>
            </div>
          </div>
        </div>

        {/* Bokningar */}
        <div className="mb-8">
          <div className="font-semibold text-base mb-2">Bokningar</div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-1">
            <div>
              <div className="text-xs text-[#6B7280]">
                Bokade, {bookedCount} st
              </div>
              <div className="text-lg font-semibold">
                {formatAmount(amountTotals.bookings_booked)}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#6B7280]">
                Genomförda, {doneCount} st
              </div>
              <div className="text-lg font-semibold">
                {formatAmount(amountTotals.bookings_done)}
              </div>
            </div>
          </div>
        </div>

        {/* Biljetter – placeholder tills vi får riktig ticket-tabell */}
        <div>
          <div className="font-semibold text-base mb-2">Biljetter</div>
          <div className="text-xs text-[#6B7280]">Köpta, 0 st</div>
          <div className="text-lg font-semibold">
            {formatAmount(amountTotals.tickets_sold)}
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-block"
        style={{
          width: 10,
          height: 10,
          backgroundColor: color,
          borderRadius: 2,
        }}
      />
      <span className="text-[#194C66]/80 text-sm">{label}</span>
    </span>
  );
}

// Behåller StatCard om du använder den på andra ställen
export function StatCard({
  title,
  value,
  sub,
}: {
  title: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="text-sm text-[#194C66]/70">{title}</div>
      <div className="text-2xl font-semibold text-[#194C66] mt-1">{value}</div>
      {sub && (
        <div className="text-xs text-[#194C66]/60 mt-1">{sub}</div>
      )}
    </div>
  );
}
