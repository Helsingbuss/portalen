// src/pages/api/dashboard/unanswered.ts
import type { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabaseAdmin";

export const config = { runtime: "nodejs" };

type Row = {
  id: string;
  offer_number: string | null;
  from: string | null;
  to: string | null;
  pax: number | null;
  type: string;
  departure_date: string | null;
  departure_time: string | null;
};

type Payload = { rows: Row[] };

const UNANSWERED = new Set([
  "", "ny", "väntar", "pending", "obesvarad", "unanswered", "inkommen", "received",
]);

export default async function handler(_req: NextApiRequest, res: NextApiResponse<Payload>) {
  try {
    const { data, error } = await supabase
      .from("offers")
      .select([
        "id",
        "offer_number",
        "departure_place",
        "destination",
        "passengers",
        "status",
        "trip_kind",
        "departure_date",
        "departure_time",
        "return_departure",
        "return_destination",
        "return_date",
        "return_time",
        "round_trip",
        "created_at",
      ].join(","))
      .order("created_at", { ascending: false })
      .limit(100);

    if (error || !Array.isArray(data)) return res.status(200).json({ rows: [] });

    const rows: Row[] = (data as any[]).filter(o => {
      const s = String(o.status ?? "").toLowerCase();
      return UNANSWERED.has(s);
    }).map(o => {
      const hasReturn =
        Boolean(o.return_departure || o.return_destination || o.return_date || o.return_time) ||
        o.round_trip === true;

      return {
        id: String(o.id),
        offer_number: o.offer_number ? String(o.offer_number) : null,
        from: o.departure_place ? String(o.departure_place) : null,
        to: o.destination ? String(o.destination) : null,
        pax: typeof o.passengers === "number" ? o.passengers : (o.pax ?? null),
        type: hasReturn ? "Tur & retur" : "Enkelresa",
        departure_date: o.departure_date ? String(o.departure_date) : null,
        departure_time: o.departure_time ? String(o.departure_time) : null,
      };
    });

    return res.status(200).json({ rows });
  } catch {
    return res.status(200).json({ rows: [] });
  }
}
