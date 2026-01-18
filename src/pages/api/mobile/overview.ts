import type { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabaseAdmin";

function getRange(req: NextApiRequest) {
  const yearParam = String(req.query.year ?? "").trim();
  const fromParam = String(req.query.from ?? "").trim();
  const toParam = String(req.query.to ?? "").trim();

  if (fromParam && toParam) return { from: fromParam, to: toParam };

  const year = yearParam ? Number(yearParam) : 2026; // DEFAULT 2026
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  return { from, to };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { from, to } = getRange(req);

    const { data: offers, error: oErr } = await supabase
      .from("offers")
      .select("id, offer_number, status, departure_place, destination, departure_date, departure_time, passengers, total_price")
      .gte("departure_date", from)
      .lte("departure_date", to)
      .order("created_at", { ascending: false })
      .limit(500);

    if (oErr) throw oErr;

    const sum = (rows: any[], filterFn: (r: any) => boolean) =>
      rows.filter(filterFn).reduce((a, r) => a + (Number(r.total_price) || 0), 0);

    const offers_answered_kr = sum(offers ?? [], (r) => String(r.status ?? "").toLowerCase() === "besvarad");
    const offers_approved_kr = sum(offers ?? [], (r) => {
      const s = String(r.status ?? "").toLowerCase();
      return s === "godkänd" || s === "godkand";
    });

    let bookings_kr = 0;
    let completed_kr = 0;

    const { data: bookings } = await supabase
      .from("bookings")
      .select("total_price, status, departure_date");

    const filtered = (bookings ?? []).filter((b: any) => {
      const d = b.departure_date;
      if (!d) return true;
      return String(d) >= from && String(d) <= to;
    });

    bookings_kr = filtered.reduce((a: number, r: any) => a + (Number(r.total_price) || 0), 0);
    completed_kr = filtered
      .filter((b: any) => {
        const s = String(b.status ?? "").toLowerCase();
        return s === "genomförd" || s === "genomford";
      })
      .reduce((a: number, r: any) => a + (Number(r.total_price) || 0), 0);

    const incoming = (offers ?? []).filter((o: any) => String(o.status ?? "").toLowerCase() === "inkommen");

    return res.status(200).json({
      range: { from, to },
      totals: { offers_answered_kr, offers_approved_kr, bookings_kr, completed_kr },
      incoming_offers: incoming.map((o: any) => ({
        id: o.id,
        offer_number: o.offer_number,
        status: o.status,
        from: o.departure_place ?? "",
        to: o.destination ?? "",
        departure_date: o.departure_date ?? null,
        departure_time: o.departure_time ?? null,
        passengers: o.passengers ?? null,
        total_price: o.total_price ?? null,
      })),
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
}
