// src/pages/api/dashboard/stats.ts
import type {
  NextApiRequest as NextApiRequestT,
  NextApiResponse as NextApiResponseT,
} from "next";

import { supabase } from "@/lib/supabaseClient";

/** Rad från offers (vi använder offer_date om den finns, annars created_at). */
type OfferRow = {
  created_at: string;
  offer_date: string | null;
  status: string | null;
};

function isYMD(s?: string): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}
function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}
function startOfDay(d: Date) {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  return t;
}
function endOfDay(d: Date) {
  const t = new Date(d);
  t.setHours(23, 59, 59, 999);
  return t;
}

/** ISO-vecka (år + veckonummer) */
function isoWeek(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() || 7) - 1; // 0..6 (mån=0)
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // torsdag i veckan
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const fdNum = (firstThursday.getUTCDay() || 7) - 1;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - fdNum + 3);
  const diffDays = Math.round((date.getTime() - firstThursday.getTime()) / 86400000);
  const week = 1 + Math.floor(diffDays / 7);
  return { year: date.getUTCFullYear(), week };
}

/** Bygg veckor (x-axel) mellan from..to */
function buildWeekAxis(from: Date, to: Date) {
  const keys: string[] = [];
  const labels: string[] = [];
  const cursor = startOfDay(new Date(from));

  // backa till måndag för snygg start
  const wd = cursor.getDay() || 7;
  if (wd !== 1) cursor.setDate(cursor.getDate() - (wd - 1));

  while (cursor <= to) {
    const { year, week } = isoWeek(cursor);
    keys.push(`${year}-W${String(week).padStart(2, "0")}`);
    labels.push(`v. ${week}`);
    cursor.setDate(cursor.getDate() + 7);
  }
  return { keys, labels };
}

export default async function handler(req: NextApiRequestT, res: NextApiResponseT) {
  try {
    const today = new Date();
    const defaultFrom = new Date();
    defaultFrom.setDate(today.getDate() - 55);

    const fromParam = Array.isArray(req.query.from) ? req.query.from[0] : req.query.from;
    const toParam = Array.isArray(req.query.to) ? req.query.to[0] : req.query.to;

    const from = startOfDay(isYMD(fromParam) ? new Date(fromParam) : defaultFrom);
    const to = endOfDay(isYMD(toParam) ? new Date(toParam) : today);

    // Hämta offers (vi filtrerar primärt på created_at för index, men kommer räkna på offer_date om den finns)
    const { data, error } = await supabase
      .from("offers")
      .select("created_at, offer_date, status")
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString());

    if (error) {
      console.error("stats api error:", error);
      return res.status(500).json({ error: "Kunde inte hämta stats" });
    }
    const offers: OfferRow[] = data ?? [];

    const { keys: weekKeys, labels: weeks } = buildWeekAxis(from, to);

    // Serierna (4 st)
    const offer_answered = Array(weekKeys.length).fill(0);
    const offer_unanswered = Array(weekKeys.length).fill(0);
    const booking_in = Array(weekKeys.length).fill(0);  // placeholder tills vi kopplar bokningar
    const booking_done = Array(weekKeys.length).fill(0); // placeholder tills vi kopplar bokningar

    for (const row of offers) {
      // använd offer_date om den finns (YYYY-MM-DD), annars created_at
      const baseDate = row.offer_date ? new Date(row.offer_date) : new Date(row.created_at);
      if (baseDate < from || baseDate > to) continue;

      const { year, week } = isoWeek(baseDate);
      const key = `${year}-W${String(week).padStart(2, "0")}`;
      const ix = weekKeys.indexOf(key);
      if (ix === -1) continue;

      const s = (row.status || "").trim().toLowerCase();
      if (s === "besvarad") {
        offer_answered[ix] += 1;
      } else {
        offer_unanswered[ix] += 1;
      }
    }

    return res.status(200).json({
      range: `${ymd(from)} – ${ymd(to)}`,
      series: { weeks, offer_answered, offer_unanswered, booking_in, booking_done },
      totals: {
        offer_answered: offer_answered.reduce((a, b) => a + b, 0),
        offer_unanswered: offer_unanswered.reduce((a, b) => a + b, 0),
        booking_in: 0,
        booking_done: 0,
      },
    });
  } catch (e: any) {
    console.error("stats api error:", e?.message || e);
    return res.status(500).json({ error: "Kunde inte hämta stats" });
  }
}
