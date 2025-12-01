// src/pages/api/pricing/save.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

type PriceInput = {
  ticket_type_id: string;
  price: number;
};

type Body = {
  trip_id?: string;
  departure_date?: string;
  prices?: PriceInput[];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });
  }

  const b = (req.body || {}) as Body;

  const trip_id = String(b.trip_id || "").trim();
  const departure_date = String(b.departure_date || "").trim();

  if (!trip_id) {
    return res
      .status(400)
      .json({ ok: false, error: "trip_id krävs." });
  }
  if (!departure_date || !/^\d{4}-\d{2}-\d{2}$/.test(departure_date)) {
    return res.status(400).json({
      ok: false,
      error: 'departure_date måste vara YYYY-MM-DD.',
    });
  }

  const prices = Array.isArray(b.prices) ? b.prices : [];

  // Normalisera priser – ta bort konstiga värden
  const cleanPrices: PriceInput[] = prices
    .map((p) => {
      const id = String(p.ticket_type_id || "").trim();
      const n = Number(p.price);
      if (!id) return null;
      if (!Number.isFinite(n) || n <= 0) return null;
      return {
        ticket_type_id: id,
        price: Math.round(n),
      };
    })
    .filter(Boolean) as PriceInput[];

  try {
    // 1) Ta bort befintliga priser för denna resa + datum
    const { error: delErr } = await supabase
      .from("departure_ticket_prices")
      .delete()
      .eq("trip_id", trip_id)
      .eq("departure_date", departure_date);

    if (delErr) throw delErr;

    // 2) Lägg in nya priser (om det finns några)
    let inserted = 0;
    if (cleanPrices.length > 0) {
      const rows = cleanPrices.map((p) => ({
        trip_id,
        departure_date,
        ticket_type_id: p.ticket_type_id,
        price: p.price,
        currency: "SEK",
      }));

      const { error: insErr, count } = await supabase
        .from("departure_ticket_prices")
        .insert(rows, { count: "exact" });

      if (insErr) throw insErr;
      inserted = typeof count === "number" ? count : rows.length;
    }

    return res.status(200).json({
      ok: true,
      saved: inserted,
    });
  } catch (e: any) {
    console.error("/api/pricing/save error:", e);
    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte spara priser.",
    });
  }
}
