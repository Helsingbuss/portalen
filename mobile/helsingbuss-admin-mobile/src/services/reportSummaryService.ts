import { supabase } from "../lib/supabase";
import type { ReportSummaryOverview } from "../types/reportSummary";

const emptySummary: ReportSummaryOverview = {
  summary: {
    weekSales: 0,
    prevWeekSales: 0,
    monthSales: 0,
    prevMonthSales: 0,
    weekPayments: 0,
    monthPayments: 0,
    paidPayments: 0,
    pendingPayments: 0,
  },
  activity: {
    offersWeek: 0,
    offersMonth: 0,
    bookingsWeek: 0,
    bookingsMonth: 0,
  },
  trends: {
    weeks: [],
    months: [],
  },
};

export async function getReportSummary(): Promise<ReportSummaryOverview> {
  const { data, error } = await supabase.rpc("get_admin_report_summary");

  if (error) {
    console.log("Report summary error:", error);
    return emptySummary;
  }

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  return {
    summary: {
      weekSales: Number(raw?.summary?.weekSales || 0),
      prevWeekSales: Number(raw?.summary?.prevWeekSales || 0),
      monthSales: Number(raw?.summary?.monthSales || 0),
      prevMonthSales: Number(raw?.summary?.prevMonthSales || 0),
      weekPayments: Number(raw?.summary?.weekPayments || 0),
      monthPayments: Number(raw?.summary?.monthPayments || 0),
      paidPayments: Number(raw?.summary?.paidPayments || 0),
      pendingPayments: Number(raw?.summary?.pendingPayments || 0),
    },
    activity: {
      offersWeek: Number(raw?.activity?.offersWeek || 0),
      offersMonth: Number(raw?.activity?.offersMonth || 0),
      bookingsWeek: Number(raw?.activity?.bookingsWeek || 0),
      bookingsMonth: Number(raw?.activity?.bookingsMonth || 0),
    },
    trends: {
      weeks: Array.isArray(raw?.trends?.weeks)
        ? raw.trends.weeks.map((item: any) => ({
            label: String(item.label || ""),
            from: String(item.from || ""),
            sales: Number(item.sales || 0),
            count: Number(item.count || 0),
          }))
        : [],
      months: Array.isArray(raw?.trends?.months)
        ? raw.trends.months.map((item: any) => ({
            label: String(item.label || ""),
            from: String(item.from || ""),
            sales: Number(item.sales || 0),
            count: Number(item.count || 0),
          }))
        : [],
    },
  };
}

export function getFallbackReportSummary() {
  return emptySummary;
}

export function formatSummaryMoney(amount: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function getChangePercent(current: number, previous: number) {
  if (!previous && !current) return 0;
  if (!previous && current) return 100;

  return Math.round(((current - previous) / previous) * 100);
}
