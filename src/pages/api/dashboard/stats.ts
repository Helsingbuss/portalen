import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";




const supabase =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

type Series = {
  weeks: string[];
  offer_answered: number[];
  offer_unanswered: number[];
  booking_in: number[];
  booking_done: number[];
};

type Payload = {
  range: string;
  series: Series;
  totals: {
    offer_answered: number;
    offer_unanswered: number;
    booking_in: number;
    booking_done: number;
  };
};

// ---------- helpers ----------
const startOfISOWeek = (d: Date) => {
  const nd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = (nd.getUTCDay() || 7); // 1..7 (Mon..Sun)
  nd.setUTCDate(nd.getUTCDate() - (day - 1));
  nd.setUTCHours(0, 0, 0, 0);
  return nd;
};

const addDays = (d: Date, n: number) => {
  const nd = new Date(d);
  nd.setUTCDate(nd.getUTCDate() + n);
  return nd;
};

const weekLabel = (d: Date) => {
  // enkel v.NN av ISO-vecka
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diff = (target.getTime() - firstThursday.getTime()) / 86400000;
  const week = 1 + Math.floor(diff / 7);
  return `v. ${week}`;
};

const buildWeeks = (from: Date, to: Date) => {
  const weeks: { start: Date; end: Date; label: string }[] = [];
  let cur = startOfISOWeek(from);
  const last = addDays(startOfISOWeek(to), 6);
  while (cur <= last) {
    const start = new Date(cur);
    const end = addDays(start, 6);
    weeks.push({ start, end, label: weekLabel(start) });
    cur = addDays(cur, 7);
  }
  return weeks;
};

const inRange = (dtStr: string | null | undefined, start: Date, end: Date) => {
  if (!dtStr) return false;
  const t = new Date(dtStr);
  return t >= start && t <= end;
};

const pushToBucket = (datestr: string | null | undefined, weeks: ReturnType<typeof buildWeeks>, arr: number[]) => {
  if (!datestr) return;
  const dt = new Date(datestr);
  const lbl = weekLabel(startOfISOWeek(dt));
  const idx = weeks.findIndex(w => w.label === lbl);
  if (idx >= 0) arr[idx] = (arr[idx] || 0) + 1;
};

// ---------- handler ----------
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Payload | { error: string }>
) {
  try {
    const fromStr = String(req.query.from ?? "").trim();
    const toStr = String(req.query.to ?? "").trim();

    const today = new Date();
    const defFrom = today.toISOString().slice(0, 10); // idag
    const defTo = "2025-12-31";

    const from = fromStr ? new Date(fromStr) : new Date(defFrom);
    const to = toStr ? new Date(toStr) : new Date(defTo);

    const weeks = buildWeeks(from, to);

    const series: Series = {
      weeks: weeks.map(w => w.label),
      offer_answered: new Array(weeks.length).fill(0),
      offer_unanswered: new Array(weeks.length).fill(0),
      booking_in: new Array(weeks.length).fill(0),
      booking_done: new Array(weeks.length).fill(0),
    };

    // Offerter
    let offers: any[] = [];
    {
      const { data, error } = await supabase
        .from("offers")
        .select("id, status, created_at, offer_date")
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString());
      if (error) {
        // Om kolumnnamn skiljer sig, fÃ¶rsÃ¶k snÃ¤ll fallback
        const { data: d2 } = await supabase.from("offers").select("*").limit(1000);
        offers = d2 || [];
      } else {
        offers = data || [];
      }
    }

    for (const o of offers) {
      const created = o.created_at ?? o.offer_date ?? null;
      const st = String(o.status ?? "").toLowerCase();
      if (!created) continue;
      const isAnswered = st === "besvarad" || st === "godkand" || st === "godkÃ¤nd";
      if (isAnswered) pushToBucket(created, weeks, series.offer_answered);
      else pushToBucket(created, weeks, series.offer_unanswered);
    }

    // Bokningar
    let bookings: any[] = [];
    {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, status, created_at")
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString());
      if (error) {
        const { data: d2 } = await supabase.from("bookings").select("*").limit(1000);
        bookings = d2 || [];
      } else {
        bookings = data || [];
      }
    }

    for (const b of bookings) {
      const created = b.created_at ?? null;
      if (!created) continue;
      const st = String(b.status ?? "").toLowerCase();
      const isDone =
        st.includes("slutf") || // slutfÃ¶rd
        st.includes("klar") ||
        st.includes("done") ||
        st.includes("completed");
      if (isDone) pushToBucket(created, weeks, series.booking_done);
      else pushToBucket(created, weeks, series.booking_in);
    }

    const payload: Payload = {
      range: `${from.toISOString().slice(0, 10)} â€“ ${to.toISOString().slice(0, 10)}`,
      series,
      totals: {
        offer_answered: series.offer_answered.reduce((a, b) => a + b, 0),
        offer_unanswered: series.offer_unanswered.reduce((a, b) => a + b, 0),
        booking_in: series.booking_in.reduce((a, b) => a + b, 0),
        booking_done: series.booking_done.reduce((a, b) => a + b, 0),
      },
    };

    // CORS och cache (bra Ã¤ven fÃ¶r WP-widget-sidor om du visar detta dÃ¤r)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");

    return res.status(200).json(payload);
  } catch (e: any) {
    console.error("/api/dashboard/stats error", e?.message || e);
    return res.status(500).json({ error: "Internt fel" });
  }
}

