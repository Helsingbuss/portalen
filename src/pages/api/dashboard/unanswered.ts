// src/pages/api/dashboard/unanswered.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabaseAdmin";

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { data, error } = await supabase
      .from("offers")
      .select("id, offer_number, departure_place, destination, passengers, round_trip, departure_date, departure_time, status, offer_date")
      .eq("status", "inkommen")
      .order("offer_date", { ascending: false })
      .limit(10);

    if (error) throw error;

    const rows: Row[] = (data ?? []).map((o: any) => ({
      id: o.id,
      offer_number: o.offer_number ?? null,
      from: o.departure_place ?? null,
      to: o.destination ?? null,
      pax: typeof o.passengers === "number" ? o.passengers : o.passengers ? Number(o.passengers) : null,
      type: o.round_trip ? "Tur & Retur" : "Enkelresa",
      departure_date: o.departure_date ?? null,
      departure_time: o.departure_time ?? null,
    }));

    return res.status(200).json({ rows });
  } catch (e: any) {
    console.error("unanswered api error:", e?.message || e);
    return res.status(500).json({ error: "Kunde inte hÃ¤mta obesvarade" });
  }
}


