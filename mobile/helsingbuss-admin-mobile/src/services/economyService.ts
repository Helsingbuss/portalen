import { supabase } from "../lib/supabase";
import type { EconomyOverview } from "../types/economy";

const emptyEconomy: EconomyOverview = {
  summary: {
    storeSales: 0,
    pendingAmount: 0,
    bookingsValue: 0,
    offersAcceptedValue: 0,
    totalVisibleValue: 0,
  },
  payments: {
    paidCount: 0,
    pendingCount: 0,
    refundedCount: 0,
  },
  bookings: {
    total: 0,
    value: 0,
    toInvoice: 0,
  },
  offers: {
    total: 0,
    accepted: 0,
    value: 0,
    acceptedValue: 0,
  },
  customers: {
    total: 0,
  },
  recentPayments: [],
};

export async function getEconomyOverview(): Promise<EconomyOverview> {
  const { data, error } = await supabase.rpc("get_admin_economy_overview");

  if (error) {
    console.log("Economy overview error:", error);
    return emptyEconomy;
  }

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  return {
    summary: {
      storeSales: Number(raw?.summary?.storeSales || 0),
      pendingAmount: Number(raw?.summary?.pendingAmount || 0),
      bookingsValue: Number(raw?.summary?.bookingsValue || 0),
      offersAcceptedValue: Number(raw?.summary?.offersAcceptedValue || 0),
      totalVisibleValue: Number(raw?.summary?.totalVisibleValue || 0),
    },
    payments: {
      paidCount: Number(raw?.payments?.paidCount || 0),
      pendingCount: Number(raw?.payments?.pendingCount || 0),
      refundedCount: Number(raw?.payments?.refundedCount || 0),
    },
    bookings: {
      total: Number(raw?.bookings?.total || 0),
      value: Number(raw?.bookings?.value || 0),
      toInvoice: Number(raw?.bookings?.toInvoice || 0),
    },
    offers: {
      total: Number(raw?.offers?.total || 0),
      accepted: Number(raw?.offers?.accepted || 0),
      value: Number(raw?.offers?.value || 0),
      acceptedValue: Number(raw?.offers?.acceptedValue || 0),
    },
    customers: {
      total: Number(raw?.customers?.total || 0),
    },
    recentPayments: Array.isArray(raw?.recentPayments)
      ? raw.recentPayments.map((item: any) => ({
          id: String(item.id || ""),
          reference: String(item.reference || ""),
          title: String(item.title || "Betalning"),
          customerName: String(item.customerName || ""),
          customerEmail: String(item.customerEmail || ""),
          customerPhone: String(item.customerPhone || ""),
          amount: Number(item.amount || 0),
          currency: String(item.currency || "SEK"),
          status: String(item.status || ""),
          paymentUrl: String(item.paymentUrl || ""),
          createdAt: String(item.createdAt || ""),
        }))
      : [],
  };
}

export function getFallbackEconomyOverview() {
  return emptyEconomy;
}

export function formatEconomyMoney(amount: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function formatEconomyDate(value?: string) {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

export function getEconomyStatusLabel(status: string) {
  const clean = String(status || "").toLowerCase();

  if (clean === "paid") return "Betald";
  if (clean === "pending") return "Väntar";
  if (clean === "reserved") return "Reserverad";
  if (clean === "refunded") return "Återbetald";
  if (clean === "failed") return "Misslyckad";

  return status || "Okänd";
}
