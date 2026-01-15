// src/pages/api/dashboard/series.ts
import type { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabaseAdmin";

export const config = { runtime: "nodejs" };

export type Series = {
  weeks: string[];
  offer_answered: number[];
  offer_unanswered: number[];
  booking_in: number[];
  booking_done: number[];
};

export type StatsTotals = {
  offer_answered_count: number;
  offer_answered_amount: number;
  offer_approved_count: number;
  offer_approved_amount: number;
  booking_booked_count: number;
  booking_booked_amount: number;
  booking_done_count: number;
  booking_done_amount: number;
};

type ApiPayload = Series & { totals: StatsTotals };

function toYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}

// Robust: Supabase numeric kan komma som string
function toNumber(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (v == null) return 0;

  const cleaned = String(v)
    .trim()
    .replace(/\s/g, "")
    .replace(/kr/gi, "")
    .replace(/sek/gi, "")
    .replace(",", ".");

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Svensk ISO-veckonummer */
function isoWeekNumber(dateLike: string | Date): number {
  const d = typeof dateLike === "string" ? new Date(dateLike) : new Date(dateLike);

  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7; // må=0..sön=6
  target.setUTCDate(target.getUTCDate() - dayNr + 3);

  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstThursdayDayNr = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstThursdayDayNr + 3);

  return 1 + Math.round((+target - +firstThursday) / (7 * 24 * 3600 * 1000));
}

function buildWeeksForRange(from: string, to: string): string[] {
  const start = new Date(from);
  const end = new Date(to);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];

  const a = start <= end ? start : end;
  const b = start <= end ? end : start;

  const seen = new Set<number>();
  const weeks: number[] = [];
  const d = new Date(a);

  while (d <= b) {
    const w = isoWeekNumber(d);
    if (!seen.has(w)) {
      seen.add(w);
      weeks.push(w);
    }
    d.setDate(d.getDate() + 7);
  }

  return weeks.map(String);
}

function isOfferUnansweredStatus(s: string) {
  // matcha samma idé som diagrammet: "inkommen/pending/ny" = obesvarad
  return ["inkommen", "pending", "ny", "new"].includes(s);
}

function isOfferExcludedStatus(s: string) {
  // ska INTE räknas som pengar i totals (om du vill ta med ändå, ta bort här)
  return ["avböjd", "avbojt", "avböjt", "declined", "makulerad", "canceled", "cancelled"].includes(s);
}

function isOfferApprovedStatus(s: string) {
  return ["godkänd", "godkand", "approved", "accepted"].includes(s);
}

function isBookingDoneStatus(s: string) {
  return ["klar", "genomförd", "genomford", "done", "completed"].includes(s);
}

function isBookingBookedStatus(s: string) {
  // här räknar vi bokade som “bokad/planerad/created”
  return ["bokad", "planerad", "booked", "created"].includes(s);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const url = new URL(req.url ?? "", "http://x");
    const from = url.searchParams.get("from") || toYMD(new Date());
    const to = url.searchParams.get("to") || "2025-12-31";

    // -------------------------
    // 1) DATA FÖR STAPELDIAGRAM
    // -------------------------
    const offersRes = await supabase
      .from("offers")
      .select("status, created_at")
      .gte("created_at", from)
      .lte("created_at", to);

    const bookingsRes = await supabase
      .from("bookings")
      .select("status, created_at")
      .gte("created_at", from)
      .lte("created_at", to);

    const offers = Array.isArray(offersRes.data) ? offersRes.data : [];
    const bookings = Array.isArray(bookingsRes.data) ? bookingsRes.data : [];

    const weeks = buildWeeksForRange(from, to);

    const weekOf = (created_at?: string | null) => {
      const day = created_at ? String(created_at).slice(0, 10) : null;
      if (!day) return null;
      return isoWeekNumber(day);
    };

    const mapAnswered = new Map<string, number>();
    const mapUnanswered = new Map<string, number>();
    const mapIn = new Map<string, number>();
    const mapDone = new Map<string, number>();
    const inc = (m: Map<string, number>, k: string) => m.set(k, 1 + (m.get(k) || 0));

    for (const o of offers as any[]) {
      const w = weekOf(o.created_at);
      if (!w) continue;
      const wk = String(w);
      const s = String(o.status ?? "").toLowerCase();

      if (isOfferUnansweredStatus(s)) inc(mapUnanswered, wk);
      else inc(mapAnswered, wk);
    }

    for (const b of bookings as any[]) {
      const w = weekOf(b.created_at);
      if (!w) continue;
      const wk = String(w);
      const s = String(b.status ?? "").toLowerCase();

      if (isBookingDoneStatus(s)) inc(mapDone, wk);
      else inc(mapIn, wk);
    }

    const toArr = (m: Map<string, number>) => weeks.map((w) => m.get(w) || 0);

    const series: Series = {
      weeks,
      offer_answered: toArr(mapAnswered),
      offer_unanswered: toArr(mapUnanswered),
      booking_in: toArr(mapIn),
      booking_done: toArr(mapDone),
    };

    // -------------------------
    // 2) TOTALS PER ÅR (HÖGER KOLONN)
    // -------------------------
    const baseDateStr = to || from || toYMD(new Date());
    const baseDate = new Date(baseDateStr);
    const year = isNaN(baseDate.getTime()) ? new Date().getFullYear() : baseDate.getFullYear();

    const yearFrom = `${year}-01-01`;
    const yearTo = `${year}-12-31`;

    // ✅ Offerter med pris
    const offersYearRes = await supabase
      .from("offers")
      .select("status, total_price, created_at")
      .gte("created_at", yearFrom)
      .lte("created_at", yearTo);

    const offersYear = Array.isArray(offersYearRes.data) ? offersYearRes.data : [];

    // ✅ Bokningar med pris (DIN TABELL HAR total_price)
    const bookingsYearRes = await supabase
      .from("bookings")
      .select("status, total_price, created_at")
      .gte("created_at", yearFrom)
      .lte("created_at", yearTo);

    const bookingsYear = Array.isArray(bookingsYearRes.data) ? bookingsYearRes.data : [];

    const totals: StatsTotals = {
      offer_answered_count: 0,
      offer_answered_amount: 0,
      offer_approved_count: 0,
      offer_approved_amount: 0,
      booking_booked_count: 0,
      booking_booked_amount: 0,
      booking_done_count: 0,
      booking_done_amount: 0,
    };

    // Offerter totals:
    // - "Besvarade" = allt som inte är unanswered och inte excluded
    // - "Godkända" = approved
    for (const row of offersYear as any[]) {
      const s = String(row.status ?? "").toLowerCase();
      const amount = toNumber(row.total_price);

      if (isOfferExcludedStatus(s)) continue;

      if (isOfferApprovedStatus(s)) {
        totals.offer_approved_count += 1;
        totals.offer_approved_amount += amount;
        // Godkända är också besvarade i praktiken, men UI visar separat,
        // så vi räknar INTE in dem i "besvarade" om du vill ha strikt separata.
        // Vill du att "besvarade" ska inkludera "godkända", uncommenta raderna nedan:
        // totals.offer_answered_count += 1;
        // totals.offer_answered_amount += amount;
        continue;
      }

      if (!isOfferUnansweredStatus(s)) {
        totals.offer_answered_count += 1;
        totals.offer_answered_amount += amount;
      }
    }

    // Bokningar totals:
    for (const row of bookingsYear as any[]) {
      const s = String(row.status ?? "").toLowerCase();
      const amount = toNumber(row.total_price);

      if (isBookingBookedStatus(s)) {
        totals.booking_booked_count += 1;
        totals.booking_booked_amount += amount;
      } else if (isBookingDoneStatus(s)) {
        totals.booking_done_count += 1;
        totals.booking_done_amount += amount;
      }
    }

    const payload: ApiPayload = { ...series, totals };
    return res.status(200).json(payload);
  } catch (e: any) {
    console.error("/api/dashboard/series error:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Serverfel" });
  }
}
