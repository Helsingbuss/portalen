// src/pages/api/dashboard/series.ts
import type { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabaseAdmin";

export const config = { runtime: "nodejs" };

// Samma struktur som OffersBarChart använder
export type Series = {
  weeks: string[];
  offer_answered: number[];
  offer_unanswered: number[];
  booking_in: number[];
  booking_done: number[];
};

// Totals som skickas till dashboarden (per år)
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

type ApiPayload = Series & {
  totals: StatsTotals;
};

function toYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Svensk ISO-veckonummer (mån som första veckodag, vecka 1 har årets första torsdag) */
function isoWeekNumber(dateLike: string | Date): number {
  const d =
    typeof dateLike === "string" ? new Date(dateLike) : new Date(dateLike);

  const target = new Date(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  );
  const dayNr = (target.getUTCDay() + 6) % 7; // må=0..sön=6
  target.setUTCDate(target.getUTCDate() - dayNr + 3);

  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstThursdayDayNr = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(
    firstThursday.getUTCDate() - firstThursdayDayNr + 3
  );

  const week =
    1 +
    Math.round(
      (+target - +firstThursday) / (7 * 24 * 3600 * 1000)
    );
  return week;
}

/** Bygger en veckolista (svenska veckor) utifrån from/to-datum */
function buildWeeksForRange(from: string, to: string): string[] {
  const start = new Date(from);
  const end = new Date(to);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];

  // säkerställ att start <= end
  if (start > end) {
    const tmp = start.getTime();
    (start as any) = end;
    (end as any) = new Date(tmp);
  }

  const seen = new Set<number>();
  const weeks: number[] = [];

  // gå framåt med 7 dagar i taget
  const d = new Date(start);
  while (d <= end) {
    const w = isoWeekNumber(d);
    if (!seen.has(w)) {
      seen.add(w);
      weeks.push(w);
    }
    d.setDate(d.getDate() + 7);
  }

  return weeks.map((n) => String(n));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const url = new URL(req.url ?? "", "http://x");
    const from = url.searchParams.get("from") || toYMD(new Date());
    const to = url.searchParams.get("to") || "2025-12-31";
    const mode = url.searchParams.get("mode") || "week"; // ev. användning senare

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

    // Veckolista utifrån datumintervallet (inte bara där det finns data)
    const weeks = buildWeeksForRange(from, to);

    // Hjälpfunktion: ge vecka för en rad
    const weekOf = (created_at?: string | null) => {
      const day = created_at ? String(created_at).slice(0, 10) : null;
      if (!day) return null;
      return isoWeekNumber(day);
    };

    // Räknare per vecka
    const mapAnswered = new Map<string, number>();
    const mapUnanswered = new Map<string, number>();
    const mapIn = new Map<string, number>();
    const mapDone = new Map<string, number>();
    const inc = (m: Map<string, number>, k: string) =>
      m.set(k, 1 + (m.get(k) || 0));

    // Offers → staplar
    for (const o of offers as any[]) {
      const w = weekOf(o.created_at);
      if (!w) continue;
      const wk = String(w);
      const s = String(o.status ?? "").toLowerCase();

      // allt som inte är "inkommen" räknas som besvarad i diagrammet
      if (s === "inkommen" || s === "pending" || s === "ny") {
        inc(mapUnanswered, wk);
      } else {
        inc(mapAnswered, wk);
      }
    }

    // Bookings → staplar
    for (const b of bookings as any[]) {
      const w = weekOf(b.created_at);
      if (!w) continue;
      const wk = String(w);
      const s = String(b.status ?? "").toLowerCase();

      if (
        s === "klar" ||
        s === "genomförd" ||
        s === "genomford" ||
        s === "done" ||
        s === "completed"
      ) {
        inc(mapDone, wk);
      } else {
        inc(mapIn, wk);
      }
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
    // Välj år utifrån "to" (eller from om to saknas)
    const baseDateStr = to || from || toYMD(new Date());
    const baseDate = new Date(baseDateStr);
    const year = isNaN(baseDate.getTime())
      ? new Date().getFullYear()
      : baseDate.getFullYear();

    const yearFrom = `${year}-01-01`;
    const yearTo = `${year}-12-31`;

    // Hämta alla offerter för året med pris
    const offersYearRes = await supabase
      .from("offers")
      .select("status, total_price, created_at")
      .gte("created_at", yearFrom)
      .lte("created_at", yearTo);

    const offersYear = Array.isArray(offersYearRes.data)
      ? offersYearRes.data
      : [];

    // Hämta alla bokningar för året (utan pris tills vidare)
    const bookingsYearRes = await supabase
      .from("bookings")
      .select("status, created_at")
      .gte("created_at", yearFrom)
      .lte("created_at", yearTo);

    const bookingsYear = Array.isArray(bookingsYearRes.data)
      ? bookingsYearRes.data
      : [];

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

    // Offerter → besvarade vs godkända, per år
    for (const row of offersYear as any[]) {
      const s = String(row.status ?? "").toLowerCase();
      const amount = Number(row.total_price ?? 0) || 0;

      if (s === "besvarad" || s === "answered") {
        totals.offer_answered_count += 1;
        totals.offer_answered_amount += amount;
      } else if (
        s === "godkänd" ||
        s === "godkand" ||
        s === "approved"
      ) {
        totals.offer_approved_count += 1;
        totals.offer_approved_amount += amount;
      }
      // övriga statusar (inkommen, avböjd, makulerad osv) tas inte med i totals
    }

    // Bokningar → bokade / genomförda per år
    for (const row of bookingsYear as any[]) {
      const s = String(row.status ?? "").toLowerCase();

      if (s === "bokad" || s === "booked") {
        totals.booking_booked_count += 1;
        // totals.booking_booked_amount += Number(row.total_price ?? 0) || 0; // när vi får prisfält
      } else if (
        s === "klar" ||
        s === "genomförd" ||
        s === "genomford" ||
        s === "done" ||
        s === "completed"
      ) {
        totals.booking_done_count += 1;
        // totals.booking_done_amount += Number(row.total_price ?? 0) || 0;  // när vi får prisfält
      }
    }

    const payload: ApiPayload = {
      ...series,
      totals,
    };

    return res.status(200).json(payload);
  } catch (e: any) {
    console.error("/api/dashboard/series error:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Serverfel" });
  }
}
