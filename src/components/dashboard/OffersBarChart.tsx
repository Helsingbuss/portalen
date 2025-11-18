// src/components/dashboard/OffersBarChart.tsx
import React, { useMemo, useState } from "react";

export type Series = {
  weeks: string[];
  offer_answered: number[];
  offer_unanswered: number[];
  booking_in: number[];
  booking_done: number[];
};

type Props = { series: Series };

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
  booking_done: "SlutfÃ¶rda bokningar",
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

export default function OffersBarChart({ series }: Props) {
  const { weeks, offer_answered, offer_unanswered, booking_in, booking_done } = series;

  const maxY = useMemo(
    () =>
      Math.max(
        1,
        ...(offer_answered.length ? offer_answered : [0]),
        ...(offer_unanswered.length ? offer_unanswered : [0]),
        ...(booking_in.length ? booking_in : [0]),
        ...(booking_done.length ? booking_done : [0])
      ),
    [offer_answered, offer_unanswered, booking_in, booking_done]
  );
  const ticks = useMemo(() => buildTicks(maxY), [maxY]);

  const height = 260,
    topPad = 20,
    bottomPad = 36,
    leftPad = 28,
    rightPad = 12;
  const innerH = height - topPad - bottomPad;
  const innerW = Math.max(weeks.length * 56, 400);
  const svgW = innerW + leftPad + rightPad;

  const barWidth = 14,
    barGap = 6,
    groupWidth = barWidth * 4 + barGap * 3;
  const y = (val: number) => topPad + innerH * (1 - val / ticks[ticks.length - 1]);

  const [tip, setTip] = useState<null | Tip>(null);
  function placeTooltip(anchorX: number, anchorY: number, label: string, value: number): Tip {
    const boxW = 160,
      boxH = 28,
      gap = 10;
    let boxX = anchorX + gap;
    if (boxX + boxW > svgW - 4) boxX = anchorX - gap - boxW;
    let boxY = anchorY - boxH / 2;
    const minY = topPad + 2,
      maxYpx = height - bottomPad - boxH - 2;
    if (boxY < minY) boxY = minY;
    if (boxY > maxYpx) boxY = maxYpx;
    return { anchorX, anchorY, boxX, boxY, label, value };
  }

  const groups = weeks.map((w, i) => ({ week: w, gx: leftPad + i * groupWidth + i * 12 }));

  return (
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
            { v: booking_done[i] || 0, c: COLORS.booking_done, key: "booking_done" as const },
            { v: booking_in[i] || 0, c: COLORS.booking_in, key: "booking_in" as const },
            { v: offer_answered[i] || 0, c: COLORS.offer_answered, key: "offer_answered" as const },
            { v: offer_unanswered[i] || 0, c: COLORS.offer_unanswered, key: "offer_unanswered" as const },
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
                    onMouseEnter={() => setTip(placeTooltip(cx, cy, LABELS[b.key], b.v))}
                    onMouseMove={() => setTip(placeTooltip(cx, cy, LABELS[b.key], b.v))}
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

      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <LegendDot color={COLORS.booking_done} label="SlutfÃ¶rda bokningar" />
        <LegendDot color={COLORS.booking_in} label="Inkomna bokningar" />
        <LegendDot color={COLORS.offer_answered} label="Besvarade offerter" />
        <LegendDot color={COLORS.offer_unanswered} label="Obesvarade offerter" />
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-block"
        style={{ width: 10, height: 10, backgroundColor: color, borderRadius: 2 }}
      />
      <span className="text-[#194C66]/80 text-sm">{label}</span>
    </span>
  );
}

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
      {sub && <div className="text-xs text-[#194C66]/60 mt-1">{sub}</div>}
    </div>
  );
}

