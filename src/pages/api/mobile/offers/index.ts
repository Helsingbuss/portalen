import type { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabaseAdmin";

function getRange(req: NextApiRequest) {
  const yearParam = String(req.query.year ?? "").trim();
  const fromParam = String(req.query.from ?? "").trim();
  const toParam = String(req.query.to ?? "").trim();

  if (fromParam && toParam) return { from: fromParam, to: toParam };

  const year = yearParam ? Number(yearParam) : 2026; // DEFAULT 2026
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { from, to } = getRange(req);

    const { data, error } = await supabase
      .from("offers")
      .select("id, offer_number, status, departure_place, destination, departure_date, departure_time, passengers, total_price, created_at")
      .gte("departure_date", from)
      .lte("departure_date", to)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    const mapped = (data ?? []).map((o: any) => ({
      id: o.id,
      offer_number: o.offer_number,
      status: o.status,
      from: o.departure_place ?? "",
      to: o.destination ?? "",
      departure_date: o.departure_date ?? null,
      departure_time: o.departure_time ?? null,
      passengers: o.passengers ?? null,
      total_price: o.total_price ?? null,
      created_at: o.created_at ?? null,
    }));

    return res.status(200).json(mapped);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
}
