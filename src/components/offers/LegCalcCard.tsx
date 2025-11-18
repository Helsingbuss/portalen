// src/components/offers/LegCalcCard.tsx
import React from "react";
import type { LegInput } from "@/lib/pricing";

type Props = {
  title: string;
  value: LegInput;
  onChange: (v: LegInput) => void;
};

export default function LegCalcCard({ title, value, onChange }: Props) {
  const set = (patch: Partial<LegInput>) => onChange({ ...value, ...patch });

  return (
    <div className="bg-white rounded-xl shadow p-4 space-y-3">
      <div className="text-[#194C66] font-semibold">{title}</div>

      <div className="flex items-center gap-3">
        <label className="inline-flex items-center gap-2 text-sm text-[#194C66]/80">
          <input
            type="radio"
            checked={value.isDomestic}
            onChange={() => set({ isDomestic: true })}
          />
          Bussresa i Sverige (6% moms)
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-[#194C66]/80">
          <input
            type="radio"
            checked={!value.isDomestic}
            onChange={() => set({ isDomestic: false })}
          />
          Bussresa utomlands (0% moms)
        </label>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Num label="Antal kilometer" value={value.km} onChange={(n) => set({ km: n })} />
        <Num label="Antal timmar dag" value={value.hoursDay} onChange={(n) => set({ hoursDay: n })} />
        <Num label="Antal timmar kvÃ¤ll" value={value.hoursEvening} onChange={(n) => set({ hoursEvening: n })} />
        <Num label="Antal timmar helg" value={value.hoursWeekend} onChange={(n) => set({ hoursWeekend: n })} />
        <Num label="Rabatt (SEK)" value={value.discount} onChange={(n) => set({ discount: n })} />
      </div>
    </div>
  );
}

function Num({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="text-sm text-[#194C66]/80">
      <span className="block mb-1">{label}</span>
      <input
        type="number"
        min={0}
        step="1"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full border rounded px-2 py-1"
      />
    </label>
  );
}

