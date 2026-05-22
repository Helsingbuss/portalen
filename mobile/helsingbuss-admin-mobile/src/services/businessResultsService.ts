import { supabase } from "../lib/supabase";
import type { BusinessUnitResultsOverview } from "../types/businessResults";

const emptyBusinessResults: BusinessUnitResultsOverview = {
  summary: {
    totalRevenue: 0,
    totalExpectedValue: 0,
    totalCosts: 0,
    totalPaidCosts: 0,
    totalPendingCosts: 0,
    totalPreliminaryResult: 0,
    totalExpectedResult: 0,
  },
  units: [],
};

export async function getBusinessUnitResults(): Promise<BusinessUnitResultsOverview> {
  const { data, error } = await supabase.rpc("get_admin_business_unit_results");

  if (error) {
    console.log("Business unit results error:", error);
    return emptyBusinessResults;
  }

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  return {
    summary: {
      totalRevenue: Number(raw?.summary?.totalRevenue || 0),
      totalExpectedValue: Number(raw?.summary?.totalExpectedValue || 0),
      totalCosts: Number(raw?.summary?.totalCosts || 0),
      totalPaidCosts: Number(raw?.summary?.totalPaidCosts || 0),
      totalPendingCosts: Number(raw?.summary?.totalPendingCosts || 0),
      totalPreliminaryResult: Number(raw?.summary?.totalPreliminaryResult || 0),
      totalExpectedResult: Number(raw?.summary?.totalExpectedResult || 0),
    },
    units: Array.isArray(raw?.units)
      ? raw.units.map((item: any) => ({
          unit: String(item.unit || "other"),
          revenue: Number(item.revenue || 0),
          expectedValue: Number(item.expectedValue || 0),
          costs: Number(item.costs || 0),
          paidCosts: Number(item.paidCosts || 0),
          pendingCosts: Number(item.pendingCosts || 0),
          preliminaryResult: Number(item.preliminaryResult || 0),
          expectedResult: Number(item.expectedResult || 0),
          payments: Number(item.payments || 0),
          invoices: Number(item.invoices || 0),
          bookings: Number(item.bookings || 0),
          offers: Number(item.offers || 0),
          expenses: Number(item.expenses || 0),
        }))
      : [],
  };
}

export function getFallbackBusinessUnitResults() {
  return emptyBusinessResults;
}

export function formatBusinessResultMoney(amount: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function getBusinessUnitLabel(unit: string) {
  const clean = String(unit || "").toLowerCase();

  if (clean === "bestallning") return "Beställningstrafik";
  if (clean === "shuttle") return "Flygbuss / Airport Shuttle";
  if (clean === "sundra") return "Sundra Resor";

  return "Övrigt";
}

export function getBusinessUnitSubtitle(unit: string) {
  const clean = String(unit || "").toLowerCase();

  if (clean === "bestallning") return "Bokningar, offerter och beställda körningar";
  if (clean === "shuttle") return "Flygbuss, flygplatser och shuttletrafik";
  if (clean === "sundra") return "Paketresor, shoppingresor och events";

  return "Poster som inte har verksamhet satt ännu";
}
