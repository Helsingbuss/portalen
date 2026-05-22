import { supabase } from "../lib/supabase";
import type { ReportExportOverview } from "../types/reportExport";

const emptyExport: ReportExportOverview = {
  summary: {
    totalRows: 0,
    totalAmount: 0,
    totalVat: 0,
    totalExVat: 0,
  },
  rows: [],
};

export async function getReportExport(): Promise<ReportExportOverview> {
  const { data, error } = await supabase.rpc("get_admin_report_export");

  if (error) {
    console.log("Report export error:", error);
    return emptyExport;
  }

  const raw = typeof data === "string" ? JSON.parse(data) : data;

  const rows = Array.isArray(raw?.rows)
    ? raw.rows.map((item: any) => ({
        id: String(item.id || ""),
        source: String(item.source || ""),
        sourceLabel: String(item.sourceLabel || ""),
        reference: String(item.reference || ""),
        date: String(item.date || ""),
        customer: String(item.customer || ""),
        email: String(item.email || ""),
        phone: String(item.phone || ""),
        title: String(item.title || ""),
        amount: Number(item.amount || 0),
        vatRate: Number(item.vatRate || 6),
        vatAmount: Number(item.vatAmount || 0),
        exVat: Number(item.exVat || 0),
        status: String(item.status || ""),
        currency: String(item.currency || "SEK"),
      }))
    : [];

  rows.sort((a: any, b: any) => {
    const aTime = a.date ? new Date(a.date).getTime() : 0;
    const bTime = b.date ? new Date(b.date).getTime() : 0;
    return bTime - aTime;
  });

  return {
    summary: {
      totalRows: Number(raw?.summary?.totalRows || 0),
      totalAmount: Number(raw?.summary?.totalAmount || 0),
      totalVat: Number(raw?.summary?.totalVat || 0),
      totalExVat: Number(raw?.summary?.totalExVat || 0),
    },
    rows,
  };
}

export function getFallbackReportExport() {
  return emptyExport;
}

export function formatExportMoney(amount: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function formatExportDate(value?: string) {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export function getExportStatusLabel(status: string) {
  const clean = String(status || "").toLowerCase();

  if (clean === "paid") return "Betald";
  if (clean === "pending") return "Väntar";
  if (clean === "reserved") return "Reserverad";
  if (clean === "accepted") return "Accepterad";
  if (clean === "godkänd" || clean === "godkand") return "Godkänd";
  if (clean === "booked" || clean === "bokad") return "Bokad";
  if (clean === "declined" || clean === "avböjd" || clean === "avbojd") return "Avböjd";

  return status || "Okänd";
}

