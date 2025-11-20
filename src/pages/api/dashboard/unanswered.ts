// src/pages/api/dashboard/unanswered.ts
import type { NextApiRequest, NextApiResponse } from "next";
import admin from "@/lib/supabaseAdmin";

export const config = { runtime: "nodejs" };

type Row = {
  id: string;
  offer_number: string | null;
  from: string | null;
  to: string | null;
  pax: number | null;
  type: string | null;            // enkel / tur_retur etc.
  departure_date: string | null;
  departure_time: string | null;
  status?: string | null;
};

type Payload = { rows: Row[] };

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse<Payload>
) {
  try {
    const { data, error } = await admin
      .from("offers")
      .select(
        `
        id,
        offer_number,
        status,
        departure_place,
        destination,
        passengers,
        pax,
        enkel_tur_retur,
        trip_kind,
        type,
        departure_date,
        departure_time
      `
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (error || !Array.isArray(data)) {
      console.error("unanswered: supabase error", error);
      return res.status(200).json({ rows: [] });
    }

    const rows: Row[] = data
      // ta bara med de som inte är besvarade/godkända/avböjda/makulerade
      .filter((o: any) => {
        const s = String(o.status ?? "").toLowerCase();
        return ![
          "besvarad",
          "answered",
          "godkänd",
          "godkand",
          "approved",
          "avböjd",
          "avbojd",
          "cancelled",
          "makulerad",
        ].includes(s);
      })
      .map((o: any) => ({
        id: String(o.id),
        offer_number: o.offer_number ? String(o.offer_number) : null,
        from: o.departure_place ? String(o.departure_place) : null,
        to: o.destination ? String(o.destination) : null,
        pax:
          typeof o.passengers === "number"
            ? o.passengers
            : typeof o.pax === "number"
            ? o.pax
            : null,
        // enkel_tur_retur är prio, annars fallbacks ifall du har gamla fält kvar
        type: o.enkel_tur_retur
          ? String(o.enkel_tur_retur)
          : o.trip_kind
          ? String(o.trip_kind)
          : o.type
          ? String(o.type)
          : null,
        departure_date: o.departure_date
          ? String(o.departure_date)
          : null,
        departure_time: o.departure_time
          ? String(o.departure_time)
          : null,
        status: o.status ? String(o.status) : null,
      }));

    return res.status(200).json({ rows });
  } catch (err) {
    console.error("unanswered: unexpected error", err);
    return res.status(200).json({ rows: [] });
  }
}
