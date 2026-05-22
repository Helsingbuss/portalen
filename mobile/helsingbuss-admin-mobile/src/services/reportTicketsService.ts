import { supabase } from "../lib/supabase";
import type { ReportTicketsOverview } from "../types/reportTickets";

const emptyReportTickets: ReportTicketsOverview = {
  totals: {
    today: 0,
    week: 0,
    month: 0,
    paid: 0,
    pending: 0,
    reserved: 0,
    refunded: 0,
    salesToday: 0,
    salesWeek: 0,
    salesMonth: 0,
  },
  categories: {
    shuttle: 0,
    trips: 0,
    other: 0,
  },
  recentTickets: [],
};

export async function getReportTickets(): Promise<ReportTicketsOverview> {
  const { data, error } = await supabase.rpc("get_admin_report_tickets");

  if (error) {
    console.log("Report tickets error:", error);
    return emptyReportTickets;
  }

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  return {
    totals: {
      today: Number(raw?.totals?.today || 0),
      week: Number(raw?.totals?.week || 0),
      month: Number(raw?.totals?.month || 0),
      paid: Number(raw?.totals?.paid || 0),
      pending: Number(raw?.totals?.pending || 0),
      reserved: Number(raw?.totals?.reserved || 0),
      refunded: Number(raw?.totals?.refunded || 0),
      salesToday: Number(raw?.totals?.salesToday || 0),
      salesWeek: Number(raw?.totals?.salesWeek || 0),
      salesMonth: Number(raw?.totals?.salesMonth || 0),
    },
    categories: {
      shuttle: Number(raw?.categories?.shuttle || 0),
      trips: Number(raw?.categories?.trips || 0),
      other: Number(raw?.categories?.other || 0),
    },
    recentTickets: Array.isArray(raw?.recentTickets)
      ? raw.recentTickets.map((item: any) => ({
          id: String(item.id || ""),
          reference: String(item.reference || ""),
          title: String(item.title || "Biljett/betalning"),
          customerName: String(item.customerName || ""),
          customerEmail: String(item.customerEmail || ""),
          customerPhone: String(item.customerPhone || ""),
          amount: Number(item.amount || 0),
          currency: String(item.currency || "SEK"),
          status: String(item.status || "unknown"),
          paymentUrl: String(item.paymentUrl || ""),
          createdAt: String(item.createdAt || ""),
          category: String(item.category || "other"),
        }))
      : [],
  };
}

export function getFallbackReportTickets() {
  return emptyReportTickets;
}

export function formatTicketMoney(amount: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function formatTicketDate(value?: string) {
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

export function getTicketStatusLabel(status: string) {
  const clean = String(status || "").toLowerCase();

  if (clean === "paid") return "Betald";
  if (clean === "pending") return "Väntar";
  if (clean === "reserved") return "Reserverad";
  if (clean === "refunded") return "Återbetald";
  if (clean === "cancelled") return "Avbruten";
  if (clean === "failed") return "Misslyckad";

  return status || "Okänd";
}

export function getTicketCategoryLabel(category: string) {
  if (category === "shuttle") return "Flygbuss";
  if (category === "trip") return "Sundra";
  return "Övrigt";
}
