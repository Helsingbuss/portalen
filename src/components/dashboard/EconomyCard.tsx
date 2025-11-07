// src/components/dashboard/EconomyCard.tsx
import { useEffect, useMemo, useState } from "react";

export type EconomySummary = {
  income: number;   // intÃ¤kter
  cost: number;     // kostnader (negativa eller positiva - vi visar -tecken Ã¤ndÃ¥)
  result: number;   // resultat = income - cost
  spark: number[];  // valfria datapunkter fÃ¶r liten graf
  periodLabel?: string;
};

type Props = {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  heightClass?: string; // t.ex. "h-[320px]" eller "h-full"
};

export default function EconomyCard({ from, to, heightClass = "h-[320px]" }: Props) {
  const [data, setData] = useState<EconomySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [fallbackUsed, setFallbackUsed] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/economy/summary?from=${from}&to=${to}`);
      if (res.status === 501) {
        // Visma ej konfigurerat â€“ fÃ¶rsÃ¶k lokalt snapshot
        setFallbackUsed(true);
        const alt = await fetch(`/api/economy/local?from=${from}&to=${to}`);
        const json = (await alt.json()) as EconomySummary;
        setData(json);
      } else {
        const json = (await res.json()) as EconomySummary;
        setData(json);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const maxSpark = useMemo(
    () => (data?.spark && data.spark.length ? Math.max(...data.spark) : 0),
    [data?.spark]
  );

  return (
    <div className={`bg-white rounded-xl shadow p-4 ${heightClass} flex flex-col`}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[#194C66] font-semibold text-lg">
          IntÃ¤kter, kostnader och resultat
        </h2>
        {data?.periodLabel && (
          <span className="text-sm text-[#194C66]/70">{data.periodLabel}</span>
        )}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-[#194C66]/70">
          Laddarâ€¦
        </div>
      ) : !data ? (
        <div className="flex-1 flex items-center justify-center text-[#194C66]/60">
          Kunde inte hÃ¤mta ekonomidata
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Stat title="IntÃ¤kter" value={data.income} positive />
            <Stat title="Kostnader" value={-Math.abs(data.cost)} />
            <Stat title="Resultat" value={data.result} positive={data.result >= 0} />
          </div>

          {/* Liten sparkline */}
          <div className="mt-6 flex-1">
            {data.spark?.length ? (
              <Sparkline values={data.spark} max={maxSpark || 1} />
            ) : (
              <div className="text-sm text-[#194C66]/60">Ingen grafdata fÃ¶r perioden.</div>
            )}
          </div>

          {fallbackUsed && (
            <div className="mt-3 text-xs text-[#194C66]/60">
              Visas frÃ¥n lokal snapshot (Visma-koppling ej aktiverad).
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ title, value, positive }: { title: string; value: number; positive?: boolean }) {
  const pretty = new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK" }).format(value);
  return (
    <div className="bg-[#f7f9fb] rounded-lg p-3">
      <div className="text-sm text-[#194C66]/70">{title}</div>
      <div className={`text-lg font-semibold ${positive ? "text-[#2E7D32]" : "text-[#C62828]"}`}>
        {pretty}
      </div>
    </div>
  );
}

function Sparkline({ values, max }: { values: number[]; max: number }) {
  const w = Math.max(values.length * 20, 180);
  const h = 80;
  const padding = 6;
  const innerW = w - padding * 2;
  const innerH = h - padding * 2;

  const points = values.map((v, i) => {
    const x = padding + (i / Math.max(1, values.length - 1)) * innerW;
    const y = padding + innerH * (1 - v / Math.max(max, 1));
    return `${x},${y}`;
  });

  return (
    <svg width={w} height={h} className="block">
      <polyline
        fill="none"
        stroke="#194C66"
        strokeWidth="2"
        points={points.join(" ")}
        opacity={0.9}
      />
      {values.map((v, i) => {
        const x = padding + (i / Math.max(1, values.length - 1)) * innerW;
        const y = padding + innerH * (1 - v / Math.max(max, 1));
        return <circle key={i} cx={x} cy={y} r={2} fill="#194C66" />;
      })}
    </svg>
  );
}

