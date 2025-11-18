// src/pages/api/dashboard/unanswered.ts
import type { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabaseAdmin";



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

export default async function handler(_req: NextApiRequest, res: NextApiResponse<Payload>) {
  try {
    // Hämta senaste 50; välj * för att undvika kolumnnamns-fel
    const { data, error } = await supabase
      .from("offers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !Array.isArray(data)) {
      return res.status(200).json({ rows: [] });
    }

    // ”Obesvarad” heuristik: status saknas, ”ny”, ”väntar”, ”pending”
    const rows: Row[] = data
      .filter((o: any) => {
        const s = String(o.status ?? "").toLowerCase();
        return s === "" || s === "ny" || s === "väntar" || s === "pending" || s === "obesvarad" || s === "unanswered";
      })
      .map((o: any) => ({
        id: String(o.id),
        offer_number: o.offer_number ? String(o.offer_number) : null,
        from: o.departure_place ? String(o.departure_place) : null,
        to: o.destination ? String(o.destination) : null,
        pax: typeof o.passengers === "number" ? o.passengers : (o.pax ?? null),
        type: o.trip_kind ? String(o.trip_kind) : (o.type ? String(o.type) : "okänd"),
        departure_date: o.departure_date ? String(o.departure_date) : null,
        departure_time: o.departure_time ? String(o.departure_time) : null,
      }));

    return res.status(200).json({ rows });
  } catch {
    return res.status(200).json({ rows: [] });
  }
}
