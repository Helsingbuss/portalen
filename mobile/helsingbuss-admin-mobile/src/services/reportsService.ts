import { supabase } from "../lib/supabase";
import type { ReportsOverview } from "../types/reports";

const emptyReports: ReportsOverview = {
  offers: {
    total: 0,
    incoming: 0,
    answered: 0,
    declined: 0,
    accepted: 0,
  },
  bookings: {
    total: 0,
  },
  payments: {
    total: 0,
    pending: 0,
    paid: 0,
    sales: 0,
  },
  customers: {
    total: 0,
  },
  partners: {
    total: 0,
  },
  fleet: {
    vehicles: 0,
    drivers: 0,
  },
  sms: {
    total: 0,
    sent: 0,
  },
};

export async function getReportsOverview(): Promise<ReportsOverview> {
  const { data, error } = await supabase.rpc("get_admin_reports_overview");

  if (error) {
    console.log("Reports overview error:", error);
    return emptyReports;
  }

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  return {
    offers: {
      total: Number(raw?.offers?.total || 0),
      incoming: Number(raw?.offers?.incoming || 0),
      answered: Number(raw?.offers?.answered || 0),
      declined: Number(raw?.offers?.declined || 0),
      accepted: Number(raw?.offers?.accepted || 0),
    },
    bookings: {
      total: Number(raw?.bookings?.total || 0),
    },
    payments: {
      total: Number(raw?.payments?.total || 0),
      pending: Number(raw?.payments?.pending || 0),
      paid: Number(raw?.payments?.paid || 0),
      sales: Number(raw?.revenue?.totalVisibleValue ?? raw?.payments?.sales ?? 0),
    },
    customers: {
      total: Number(raw?.customers?.total || 0),
    },
    partners: {
      total: Number(raw?.partners?.total || 0),
    },
    fleet: {
      vehicles: Number(raw?.fleet?.vehicles || 0),
      drivers: Number(raw?.fleet?.drivers || 0),
    },
    sms: {
      total: Number(raw?.sms?.total || 0),
      sent: Number(raw?.sms?.sent || 0),
    },
  };
}

export function getFallbackReportsOverview() {
  return emptyReports;
}

export function formatReportMoney(amount: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

