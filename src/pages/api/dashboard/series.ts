// src/pages/api/dashboard/series.ts
import type { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabaseAdmin";

export const config = { runtime: "nodejs" };

type Series = {
  weeks: string[];                // ["48","49","50",...]
  offer_answered: number[];
  offer_unanswered: number[];
  booking_in: number[];
  booking_done: number[];
};

function toYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Svensk ISO-veckonummer (mån som första veckodag, vecka 1 har årets första torsdag) */
function isoWeekNumber(dateLike: string | Date): number {
  const d = typeof dateLike === "string" ? new Date(dateLike) : new Date(dateLike);
  // Klona och sätt till torsdag i aktuell vecka
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7; // må=0..sön=6
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstThursdayDayNr = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstThursdayDayNr + 3);
  const week = 1 + Math.round((+target - +firstThursday) / (7 * 24 * 3600 * 1000));
  return week;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const url = new URL(req.url ?? "", "http://x");
    const from = url.searchParams.get("from") || toYMD(new Date());
    const to   = url.searchParams.get("to")   || "2025-12-31";

    // Hämta data (utan .catch på builder – gör felhantering efteråt)
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

    const offers   = Array.isArray(offersRes.data)   ? offersRes.data   : [];
    const bookings = Array.isArray(bookingsRes.data) ? bookingsRes.data : [];

    // Samla veckor som förekommer
    const weekSet = new Set<number>();
    const weekOf = (created_at?: string | null) => {
      const day = created_at ? String(created_at).slice(0, 10) : null;
      if (!day) return null;
      const w = isoWeekNumber(day);
      weekSet.add(w);
      return w;
    };

    offers.forEach(o => weekOf(o.created_at));
    bookings.forEach(b => weekOf(b.created_at));

    const weeks = Array.from(weekSet).sort((a,b)=>a-b).map(n => String(n));

    // Räknare per vecka
    const mapAnswered   = new Map<string, number>();
    const mapUnanswered = new Map<string, number>();
    const mapIn         = new Map<string, number>();
    const mapDone       = new Map<string, number>();
    const inc = (m: Map<string, number>, k: string) => m.set(k, 1 + (m.get(k) || 0));

    // Offers
    for (const o of offers) {
      const w = weekOf(o.created_at); if (!w) continue;
      const wk = String(w);
      const s = String((o as any).status ?? "").toLowerCase();
      if (s === "besvarad" || s === "answered") inc(mapAnswered, wk);
      else inc(mapUnanswered, wk);
    }

    // Bookings
    for (const b of bookings) {
      const w = weekOf(b.created_at); if (!w) continue;
      const wk = String(w);
      const s = String((b as any).status ?? "").toLowerCase();
      if (s === "klar" || s === "done" || s === "completed") inc(mapDone, wk);
      else inc(mapIn, wk);
    }

    const toArr = (m: Map<string, number>) => weeks.map(w => m.get(w) || 0);

    const payload: Series = {
      weeks,
      offer_answered:   toArr(mapAnswered),
      offer_unanswered: toArr(mapUnanswered),
      booking_in:       toArr(mapIn),
      booking_done:     toArr(mapDone),
    };

    return res.status(200).json(payload);
  } catch (e:any) {
    console.error("/api/dashboard/series error:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Serverfel" });
  }
}
