// src/pages/api/dashboard/stats.ts
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

type StatsTotals = {
  offer_answered_count: number;
  offer_answered_amount: number;
  offer_approved_count: number;
  offer_approved_amount: number;
  booking_booked_count: number;
  booking_booked_amount: number;
  booking_done_count: number;
  booking_done_amount: number;
};

type JsonOk = { ok: true; series: Series; totals: StatsTotals };
type JsonError = { error: string };

function toMoneyNumber(v: any): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (v == null) return 0;
  const s = String(v)
    .trim()
    .replace(/\s+/g, "")
    .replace(/\u00A0/g, "")
    .replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

// Försök hitta "hela totalen" i rätt ordning (inkl vat_breakdown.grandTotal)
function extractTotalAmount(row: any): number {
  if (!row) return 0;

  const directKeys = [
    "grand_total",
    "grandTotal",
    "total_amount",
    "totalAmount",
    "total_price",
    "totalPrice",
    "total",
    "amount",
    "sum",
    "offer_total",
    "offerTotal",
    "final_total",
    "finalTotal",
  ];

  for (const k of directKeys) {
    if (row[k] !== undefined && row[k] !== null) {
      const n = toMoneyNumber(row[k]);
      if (n) return n;
    }
  }

  // vat_breakdown kan vara JSON
  const vb = row.vat_breakdown ?? row.vatBreakdown ?? null;
  if (vb) {
    // om string, försök parsea
    if (typeof vb === "string") {
      try {
        const obj = JSON.parse(vb);
        const n =
          toMoneyNumber(obj?.grandTotal) ||
          toMoneyNumber(obj?.grand_total) ||
          toMoneyNumber(obj?.totalInclVat) ||
          toMoneyNumber(obj?.total_incl_vat) ||
          toMoneyNumber(obj?.total);
        if (n) return n;
      } catch {
        // ignore
      }
    } else if (typeof vb === "object") {
      const n =
        toMoneyNumber(vb?.grandTotal) ||
        toMoneyNumber(vb?.grand_total) ||
        toMoneyNumber(vb?.totalInclVat) ||
        toMoneyNumber(vb?.total_incl_vat) ||
        toMoneyNumber(vb?.total);
      if (n) return n;
    }
  }

  // line_items/items: summera om det finns
  const items = row.line_items ?? row.items ?? null;
  if (Array.isArray(items) && items.length) {
    let sum = 0;
    for (const it of items) {
      sum +=
        toMoneyNumber(it?.total) ||
        toMoneyNumber(it?.amount) ||
        toMoneyNumber(it?.price) ||
        0;
    }
    if (sum) return sum;
  }

  return 0;
}

function isAnsweredOfferStatus(s: any): boolean {
  const v = String(s || "").toLowerCase();
  return ["besvarad", "answered", "sent", "skickad", "svarad"].includes(v);
}

function isApprovedOfferStatus(s: any): boolean {
  const v = String(s || "").toLowerCase();
  return ["godkand", "godkänd", "approved", "accepted"].includes(v);
}

function isDoneBookingStatus(s: any): boolean {
  const v = String(s || "").toLowerCase();
  return ["genomford", "genomförd", "done", "completed", "avslutad"].includes(v);
}

function isBookedBookingStatus(s: any): boolean {
  const v = String(s || "").toLowerCase();
  return ["bokad", "planerad", "created", "confirmed", "bekraftad", "bekräftad"].includes(v);
}

// ISO-week (svensk)
function isoWeek(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((+d - +yearStart) / 86400000 + 1) / 7);
  return weekNo;
}

function clampYear(y: any) {
  const n = Number(y);
  if (!Number.isFinite(n)) return new Date().getFullYear();
  return Math.max(2000, Math.min(2100, Math.floor(n)));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<JsonOk | JsonError>
) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    if (!supabase) return res.status(500).json({ error: "Supabase-admin saknas." });

    const year = clampYear(req.query.year);
    const from = new Date(`${year}-01-01T00:00:00.000Z`);
    const to = new Date(`${year}-12-31T23:59:59.999Z`);

    // Hämta offerter (minsta möjliga + vat_breakdown)
    const { data: offers, error: offErr } = await supabase
      .from("offers")
      .select("id,status,created_at,vat_breakdown,grand_total,total_amount,total_price,total")
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString());

    if (offErr) throw offErr;

    // Hämta bokningar (för counts + ev totals om du har totalsfält)
    const { data: bookings, error: bkErr } = await supabase
      .from("bookings")
      .select("id,status,created_at,vat_breakdown,grand_total,total_amount,total_price,total")
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString());

    if (bkErr) throw bkErr;

    // Bygg vecka-lista 1..53 (vi tar bara de som faktiskt används)
    const weekSet = new Set<number>();
    for (const o of offers || []) weekSet.add(isoWeek(new Date(o.created_at)));
    for (const b of bookings || []) weekSet.add(isoWeek(new Date(b.created_at)));

    const weekNums = Array.from(weekSet).sort((a, b) => a - b);
    const weeks = (weekNums.length ? weekNums : [1]).map((w) => String(w));

    const idxOfWeek = (w: number) => Math.max(0, weekNums.indexOf(w));

    const series: Series = {
      weeks,
      offer_answered: Array(weeks.length).fill(0),
      offer_unanswered: Array(weeks.length).fill(0),
      booking_in: Array(weeks.length).fill(0),
      booking_done: Array(weeks.length).fill(0),
    };

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

    // Offerter: count + totals
    for (const o of offers || []) {
      const w = isoWeek(new Date(o.created_at));
      const i = idxOfWeek(w);
      const amount = extractTotalAmount(o);

      if (isApprovedOfferStatus(o.status)) {
        totals.offer_approved_count += 1;
        totals.offer_approved_amount += amount;
        // godkänd räknas vanligtvis också som "besvarad" i staplar? -> NEJ här, vi håller isär
        series.offer_answered[i] += 1;
        totals.offer_answered_count += 1;
        totals.offer_answered_amount += amount;
      } else if (isAnsweredOfferStatus(o.status)) {
        totals.offer_answered_count += 1;
        totals.offer_answered_amount += amount;
        series.offer_answered[i] += 1;
      } else {
        series.offer_unanswered[i] += 1;
      }
    }

    // Bokningar: count + totals (om totalsfält finns, annars blir 0)
    for (const b of bookings || []) {
      const w = isoWeek(new Date(b.created_at));
      const i = idxOfWeek(w);
      const amount = extractTotalAmount(b);

      if (isDoneBookingStatus(b.status)) {
        totals.booking_done_count += 1;
        totals.booking_done_amount += amount;
        series.booking_done[i] += 1;
      } else if (isBookedBookingStatus(b.status)) {
        totals.booking_booked_count += 1;
        totals.booking_booked_amount += amount;
        series.booking_in[i] += 1;
      } else {
        // ok, räknas inte
      }
    }

    return res.status(200).json({ ok: true, series, totals });
  } catch (e: any) {
    console.error("/api/dashboard/stats error:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Serverfel" });
  }
}
