// src/pages/api/dashboard/series.ts
import type { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabaseAdmin";



type Series = {
  weeks: string[];            // etiketter till grafen (nu bara "48","49","50"...)
  offer_answered: number[];
  offer_unanswered: number[];
  booking_in: number[];
  booking_done: number[];
};

const EMPTY: Series = {
  weeks: [],
  offer_answered: [],
  offer_unanswered: [],
  booking_in: [],
  booking_done: [],
};

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

// ISO-vecka (svensk standard)
function weekKey(d: Date) {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (dt.getUTCDay() + 6) % 7;     // mån=0 … sön=6
  dt.setUTCDate(dt.getUTCDate() - dayNum + 3); // till torsdag
  const firstThu = new Date(Date.UTC(dt.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round((+dt - +firstThu) / 604800000);
  const ww = String(week).padStart(2, "0");    // "01".."53"
  return `${dt.getUTCFullYear()}-W${ww}`;      // t.ex. "2025-W49"
}

function makeWeekBins(fromStr: string, toStr: string) {
  const keys: string[] = [];
  const map = new Map<string, number>();
  const from = new Date(fromStr);
  const to = new Date(toStr);
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const k = weekKey(d);
    if (!map.has(k)) {
      map.set(k, keys.length);
      keys.push(k);
    }
  }
  return { keys, indexOf: (k: string) => map.get(k) ?? -1 };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const from = String(req.query.from || ymd(new Date()));
    const to = String(req.query.to || "2025-12-31");

    const { keys, indexOf } = makeWeekBins(from, to);
    const n = keys.length;

    const series: Series = {
      weeks: Array(n).fill(""),
      offer_answered: Array(n).fill(0),
      offer_unanswered: Array(n).fill(0),
      booking_in: Array(n).fill(0),
      booking_done: Array(n).fill(0),
    };

    // --- OFFERS ---
    const { data: offers } = await supabase
      .from("offers")
      .select("*")
      .gte("created_at", from)
      .lte("created_at", to);

    if (Array.isArray(offers)) {
      for (const row of offers) {
        const created = row.created_at ? new Date(row.created_at) : null;
        if (!created) continue;
        const k = weekKey(created);
        const i = indexOf(k);
        if (i < 0) continue;

        const s = String(row.status ?? "").toLowerCase();
        if (["besvarad", "answered", "godkänd", "accepted"].includes(s)) {
          series.offer_answered[i] += 1;
        } else {
          series.offer_unanswered[i] += 1;
        }
      }
    }

    // --- BOOKINGS (valfritt om tabellen finns) ---
    try {
      const { data: bookings } = await supabase
        .from("bookings")
        .select("*")
        .gte("created_at", from)
        .lte("created_at", to);

      if (Array.isArray(bookings)) {
        for (const row of bookings) {
          const created = row.created_at ? new Date(row.created_at) : null;
          if (!created) continue;
          const k = weekKey(created);
          const i = indexOf(k);
          if (i < 0) continue;

          const st = String(row.status ?? "").toLowerCase();
          if (["klar", "done", "slutförd"].includes(st)) {
            series.booking_done[i] += 1;
          } else {
            series.booking_in[i] += 1;
          }
        }
      }
    } catch {
      /* ignorera om tabell saknas */
    }

    // --- Mappa etiketter till enbart veckonummer ---
    // "2025-W49" -> "49" (utan ledande nolla)
    series.weeks = keys.map(k => {
      const ww = k.split("-W")[1] ?? k;
      return String(parseInt(ww, 10)); // "01" -> "1"
    });

    return res.status(200).json(series);
  } catch {
    return res.status(200).json(EMPTY);
  }
}
