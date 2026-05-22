import { supabase } from "../lib/supabase";
import type { BusinessUnitsReport } from "../types/reportBusinessUnits";

const emptyBusinessUnits: BusinessUnitsReport = {
  units: [],
  totals: {
    sales: 0,
    paidPayments: 0,
    pendingPayments: 0,
    totalPayments: 0,
  },
};

export async function getBusinessUnitsReport(): Promise<BusinessUnitsReport> {
  const { data, error } = await supabase.rpc("get_admin_report_business_units");

  if (error) {
    console.log("Business units report error:", error);
    return emptyBusinessUnits;
  }

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  return {
    units: Array.isArray(raw?.units)
      ? raw.units.map((item: any) => ({
          key: String(item.key || ""),
          label: String(item.label || ""),
          totalPayments: Number(item.totalPayments || 0),
          paidPayments: Number(item.paidPayments || 0),
          pendingPayments: Number(item.pendingPayments || 0),
          refundedPayments: Number(item.refundedPayments || 0),
          sales: Number(item.sales || 0),
          salesToday: Number(item.salesToday || 0),
          salesWeek: Number(item.salesWeek || 0),
          salesMonth: Number(item.salesMonth || 0),
        }))
      : [],
    totals: {
      sales: Number(raw?.totals?.sales || 0),
      paidPayments: Number(raw?.totals?.paidPayments || 0),
      pendingPayments: Number(raw?.totals?.pendingPayments || 0),
      totalPayments: Number(raw?.totals?.totalPayments || 0),
    },
  };
}

export function getFallbackBusinessUnitsReport() {
  return emptyBusinessUnits;
}

export function formatBusinessMoney(amount: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function getBusinessUnitDescription(key: string) {
  if (key === "charter") return "Bokningar, offerter och beställningstrafik.";
  if (key === "shuttle") return "Flygbuss, Airport Shuttle och hbshuttle.";
  if (key === "sundra") return "Dagsresor, paketresor och Sundra.";
  return "Övriga betalningar och manuell kassa.";
}
