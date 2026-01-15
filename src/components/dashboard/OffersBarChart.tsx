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
  offer_answered_amount: number | string;
  offer_approved_count: number;
  offer_approved_amount: number | string;
  booking_booked_count: number;
  booking_booked_amount: number | string;
  booking_done_count: number;
  booking_done_amount: number | string;
};

type Props = {
  series: Series;
  totals?: StatsTotals;
};

const COLORS = {
  offer_answered: "#2E7D32",
  offer_unanswered: "#A5D6A7",
  booking_in: "#C62828",
  booking_done: "#F48FB1",
};

const LABELS: Record<keyof Series, string> = {
  weeks: "Vecka",
  offer_answered: "Besvarade offerter",
  offer_unanswered: "Obesvarade offerter",
  booking_in: "Inkomna bokningar",
  booking_done: "Genomförda bokningar",
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

function toAmount(v: any): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    // supabase numeric kan komma som string
    const cleaned = v.replace(/\s/g, "").replace(",", ".");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

const formatKr = (value: number | string) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(toAmount(value));

export default function OffersBarChart({ series, totals }: Props) {
  const weeks = series.weeks && series.weeks.length ? series.weeks : ["1"];

  const safe = (arr: number[] | undefined, i: number) => (arr && arr[i]) ?? 0;

  const offerAnswered = series.offer_answered ?? [];
  const offerUnanswered = series.offer_unanswered ?? [];
  const bookingIn = series.booking_in ?? [];
  const bookingDone = series.booking_done ?? [];

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

  const countFromSeries = useMemo(
    () => ({
      offer_answered: (offerAnswered || []).reduce((a, b) => a + b, 0),
      offer_unanswered: (offerUnanswered || []).reduce((a, b) => a + b, 0),
      booking_in: (bookingIn || []).reduce((a, b) => a + b, 0),
      booking_done: (bookingDone || []).reduce((a, b) => a + b, 0),
    }),
    [offerAnswered, offerUnanswered, bookingIn, bookingDone]
  );

  const answeredCount = totals?.offer_answered_count ?? countFromSeries.offer_answered;
  const approvedCount = totals?.offer_approved_count ?? 0;

  const bookedCount = totals?.booking_booked_count ?? countFromSeries.booking_in;
  const doneCount = totals?.booking_done_count ?? countFromSeries.booking_done;

  const amountTotals = {
    offers_answered: toAmount(totals?.offer_answered_amount ?? 0),
    offers_approved: toAmount(totals?.offer_approved_amount ?? 0),
    bookings_booked: toAmount(totals?.booking_booked_amount ?? 0),
    bookings_done: toAmount(totals?.booking_done_amount ?? 0),
    tickets_sold: 0,
  };

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
  const y = (val: number) => topPad + innerH * (1 - val / ticks[ticks.length - 1]);

  const [tip, setTip] = useState<null | Tip>(null);

  function placeTooltip(anchorX: number, anchorY: number, label: string, value: number): Tip {
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
      <div className="relative w-full overflow-x-auto">
        <svg width={svgW} height={height} className="block">
          {ticks.map((value, i) => {
            const yPos = y(value);
            return (
              <g key={`grid-${i}`}>
                <line x1={leftPad} x2={leftPad + innerW} y1={yPos} y2={yPos} stroke="#E5E7EB" />
                <text x={leftPad - 7} y={yPos + 4} textAnchor="end" fill="#6B7280" fontSize="10">
                  {value}
                </text>
              </g>
            );
          })}

          {groups.map(({ week, gx }, i) => {
            const bars = [
              { v: safe(bookingDone, i), c: COLORS.booking_done, key: "booking_done" as const },
              { v: safe(bookingIn, i), c: COLORS.booking_in, key: "booking_in" as const },
              { v: safe(offerAnswered, i), c: COLORS.offer_answered, key: "offer_answered" as const },
              { v: safe(offerUnanswered, i), c: COLORS.offer_unanswered, key: "offer_unanswered" as const },
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
                      onMouseEnter={() => setTip(placeTooltip(cx, cy, LABELS[b.key], b.v ?? 0))}
                      onMouseMove={() => setTip(placeTooltip(cx, cy, LABELS[b.key], b.v ?? 0))}
                      onMouseLeave={() => setTip(null)}
                    />
                  );
                })}

                <text x={gx + groupWidth / 2} y={height - 10} textAnchor="middle" fill="#6B7280" fontSize="11">
                  {week}
                </text>
              </g>
            );
          })}

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
              <rect x={tip.boxX} y={tip.boxY} width={160} height={28} fill="white" stroke="#E5E7EB" rx={6} />
              <text x={tip.boxX + 80} y={tip.boxY + 18} textAnchor="middle" fontSize="11" fill="#111827">
                {tip.label}: {tip.value}
              </text>
            </g>
          )}
        </svg>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <LegendDot color={COLORS.offer_answered} label="Besvarade offerter" />
          <LegendDot color={COLORS.offer_unanswered} label="Obesvarade offerter" />
          <LegendDot color={COLORS.booking_in} label="Inkomna bokningar" />
          <LegendDot color={COLORS.booking_done} label="Genomförda bokningar" />
        </div>
      </div>

      <div className="flex flex-col self-start pt-1 text-sm text-[#111827] space-y-4">
        <div>
          <div className="font-semibold text-base mb-2">Offerter</div>
          <div className="grid grid-cols-2 gap-x-10 gap-y-2">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-[#9CA3AF]">Besvarade, {answeredCount} st</div>
              <div className="mt-1 text-xl font-semibold">{formatKr(amountTotals.offers_answered)} kr</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wide text-[#9CA3AF]">Godkända, {approvedCount} st</div>
              <div className="mt-1 text-xl font-semibold">{formatKr(amountTotals.offers_approved)} kr</div>
            </div>
          </div>
        </div>

        <div>
          <div className="font-semibold text-base mb-2">Bokningar</div>
          <div className="grid grid-cols-2 gap-x-10 gap-y-2">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-[#9CA3AF]">Bokade, {bookedCount} st</div>
              <div className="mt-1 text-xl font-semibold">{formatKr(amountTotals.bookings_booked)} kr</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wide text-[#9CA3AF]">Genomförda, {doneCount} st</div>
              <div className="mt-1 text-xl font-semibold">{formatKr(amountTotals.bookings_done)} kr</div>
            </div>
          </div>
        </div>

        <div>
          <div className="font-semibold text-base mb-2">Biljetter</div>
          <div className="flex items-baseline justify-between">
            <div className="text-[11px] uppercase tracking-wide text-[#9CA3AF]">Köpta, 0 st</div>
            <div className="text-xl font-semibold">{formatKr(amountTotals.tickets_sold)} kr</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-block" style={{ width: 10, height: 10, backgroundColor: color, borderRadius: 2 }} />
      <span className="text-[#194C66]/80 text-sm">{label}</span>
    </span>
  );
}

export function StatCard({ title, value, sub }: { title: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="text-sm text-[#194C66]/70">{title}</div>
      <div className="text-2xl font-semibold text-[#194C66] mt-1">{value}</div>
      {sub && <div className="text-xs text-[#194C66]/60 mt-1">{sub}</div>}
    </div>
  );
}
