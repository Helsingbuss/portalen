// src/pages/api/dashboard/series.ts
import type { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabaseAdmin";

export const config = { runtime: "nodejs" };

type Series = {
  weeks: string[];
  offer_answered: number[];
  offer_unanswered: number[];
  booking_in: number[];
  booking_done: number[];
};

type Payload = Series;

function ymd(d: Date) { return d.toISOString().slice(0,10); }

// Svensk ISO-vecka
function weekNo(dateStr: string): number {
  const d = new Date(dateStr + "T12:00:00Z"); // undvik TZ-glapp
  // ISO: torsdagstrick
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  // Torsdag i aktuell vecka
  const day = (tmp.getUTCDay() + 6) % 7; // 0=mån
  tmp.setUTCDate(tmp.getUTCDate() - day + 3);
  // Första torsdagen på året
  const firstThu = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 4));
  const firstDay = (firstThu.getUTCDay() + 6) % 7;
  firstThu.setUTCDate(firstThu.getUTCDate() - firstDay + 3);
  // Veckonummer
  const diff = tmp.getTime() - firstThu.getTime();
  return 1 + Math.round(diff / (7 * 24 * 3600 * 1000));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Payload | { error: string }>
) {
  try {
    const from = String(req.query.from || ymd(new Date()));
    const to   = String(req.query.to   || "2025-12-31");

    // Hämta OFFERS i intervallet (på offer_date om den finns, annars created_at)
    const { data: offers, error: oerr } = await supabase
      .from("offers")
      .select("*")
      .gte("offer_date", from)
      .lte("offer_date", to);

    if (oerr) throw oerr;

    // Hämta BOOKINGS (om du har en bookings-tabell; annars tomma arr)
    let bookings: any[] = [];
    try {
      const { data: bdata } = await supabase
        .from("bookings")
        .select("*")
        .gte("created_at", from)
        .lte("created_at", to);
      bookings = bdata ?? [];
    } catch { /* tolerera om tabellen inte finns */ }

    // Samla veckor som förekommer
    const weekSet = new Set<number>();

    const oWeek = (o: any) => {
      const d = String(o.offer_date || o.created_at || "").slice(0,10);
      if (!d) return null;
      const w = weekNo(d);
      if (w) weekSet.add(w);
      return w;
    };
    const bWeek = (b: any) => {
      const d = String(b.created_at || "").slice(0,10);
      if (!d) return null;
      const w = weekNo(d);
      if (w) weekSet.add(w);
      return w;
    };

    offers.forEach(oWeek);
    bookings.forEach(bWeek);

    const weeks = Array.from(weekSet).sort((a,b)=>a-b).map(n => String(n));

    const counters = {
      offer_answered:   new Map<string, number>(),
      offer_unanswered: new Map<string, number>(),
      booking_in:       new Map<string, number>(),
      booking_done:     new Map<string, number>(),
    };

    const inc = (m: Map<string, number>, k: string) =>
      m.set(k, 1 + (m.get(k) || 0));

    // offers
    for (const o of offers) {
      const w = oWeek(o);
      if (!w) continue;
      const ww = String(w);
      const s = String(o.status ?? "").toLowerCase();
      if (s === "besvarad" || s === "answered") inc(counters.offer_answered, ww);
      else                                      inc(counters.offer_unanswered, ww);
    }

    // bookings (om finns)
    for (const b of bookings) {
      const ww = bWeek(b);
      if (!ww) continue;
      const w = String(ww);
      const s = String(b.status ?? "").toLowerCase();
      if (s === "klar" || s === "done" || s === "completed") inc(counters.booking_done, w);
      else                                                   inc(counters.booking_in,   w);
    }

    const toArr = (m: Map<string, number>) => weeks.map(w => m.get(w) || 0);

    const payload: Series = {
      weeks,
      offer_answered:   toArr(counters.offer_answered),
      offer_unanswered: toArr(counters.offer_unanswered),
      booking_in:       toArr(counters.booking_in),
      booking_done:     toArr(counters.booking_done),
    };

    return res.status(200).json(payload);
  } catch (e:any) {
    console.error("/api/dashboard/series error:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Serverfel" });
  }
}
