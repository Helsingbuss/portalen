import React from "react";

type InvestorTopStatsProps = {
  revenue: number;
  revenueChange: number;
  costs: number;
  costsChange: number;
  profit: number;
  profitChange: number;
};

function formatCurrency(value: number): string {
  return value.toLocaleString("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  });
}

function formatChange(value: number): string {
  if (!Number.isFinite(value)) return "0 %";
  const rounded = Math.round(value);
  const sign = rounded > 0 ? "+" : "";
  return sign + String(rounded) + " %";
}

export default function InvestorTopStats(props: InvestorTopStatsProps) {
  const { revenue, revenueChange, costs, costsChange, profit, profitChange } =
    props;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Intäkter */}
      <div className="rounded-xl bg-white border border-slate-200 px-5 py-4 shadow-sm">
        <div className="text-xs font-semibold tracking-[0.16em] text-[#194C66]/80 uppercase">
          Månatliga intäkter
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <div className="text-2xl font-semibold text-[#0f172a]">
            {formatCurrency(revenue)}
          </div>
          <div className="text-xs font-medium text-emerald-600">
            {formatChange(revenueChange)}
          </div>
        </div>
        <div className="mt-1 text-xs text-slate-500">
          Jämfört med föregående månad
        </div>
      </div>

      {/* Kostnader */}
      <div className="rounded-xl bg-white border border-slate-200 px-5 py-4 shadow-sm">
        <div className="text-xs font-semibold tracking-[0.16em] text-[#194C66]/80 uppercase">
          Månatliga kostnader
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <div className="text-2xl font-semibold text-[#0f172a]">
            {formatCurrency(costs)}
          </div>
          <div className="text-xs font-medium text-rose-600">
            {formatChange(costsChange)}
          </div>
        </div>
        <div className="mt-1 text-xs text-slate-500">
          Jämfört med föregående månad
        </div>
      </div>

      {/* Lönsamhet */}
      <div className="rounded-xl bg-white border border-slate-200 px-5 py-4 shadow-sm">
        <div className="text-xs font-semibold tracking-[0.16em] text-[#194C66]/80 uppercase">
          Prognostiserad lönsamhet
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <div className="text-2xl font-semibold text-[#0f172a]">
            {formatCurrency(profit)}
          </div>
          <div className="text-xs font-medium text-emerald-600">
            {formatChange(profitChange)}
          </div>
        </div>
        <div className="mt-1 text-xs text-slate-500">
          Prognos kommande 12 månader
        </div>
      </div>
    </div>
  );
}
