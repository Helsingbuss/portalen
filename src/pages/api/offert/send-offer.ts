// src/pages/api/offert/send-offer.ts
import type { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabaseAdmin";
import { sendOfferMail } from "@/lib/sendMail";

export const config = { runtime: "nodejs" };

type OfferRow = {
  id: string;
  offer_number: string;
  contact_person: string | null;
  customer_email: string | null;
  customer_phone: string | null;

  departure_place: string | null;
  destination: string | null;
  departure_date: string | null;
  departure_time: string | null;

  via: string | null;
  stop: string | null;
  passengers?: number | null;

  return_departure: string | null;
  return_destination: string | null;
  return_date: string | null;
  return_time: string | null;

  notes?: string | null;
};

const S = (v: any) => (v == null ? null : String(v).trim() || null);
const U = <T extends string | number | null | undefined>(v: T) =>
  (v == null ? undefined : (v as Exclude<T, null>));
const isOfferRow = (d: any): d is OfferRow =>
  d && typeof d === "object" && typeof d.id === "string" && typeof d.offer_number === "string";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const id = String((req.body?.offer_id ?? req.query.id ?? "") || "");
    if (!id) return res.status(400).json({ error: "Saknar offert-id" });

    const { data, error } = await supabase
      .from("offers")
      .select([
        "id",
        "offer_number",
        "contact_person",
        "customer_email",
        "customer_phone",
        "departure_place",
        "destination",
        "departure_date",
        "departure_time",
        "via",
        "stop",
        "passengers",
        "return_departure",
        "return_destination",
        "return_date",
        "return_time",
        "notes",
      ].join(","))
      .eq("id", id)
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!isOfferRow(data)) return res.status(500).json({ error: "Dataparsning misslyckades (OfferRow)" });

    const offer = data;

    await sendOfferMail({
      offerId:     String(offer.id),
      offerNumber: String(offer.offer_number),

      customerEmail: U(S(offer.customer_email)),
      customerName:  U(S(offer.contact_person)),

      from: U(S(offer.departure_place)),
      to:   U(S(offer.destination)),
      date: U(S(offer.departure_date)),
      time: U(S(offer.departure_time)),

      via:  U(S(offer.via)),
      stop: U(S(offer.stop)),
      passengers: typeof offer.passengers === "number" ? offer.passengers : undefined,

      return_from: U(S(offer.return_departure)),
      return_to:   U(S(offer.return_destination)),
      return_date: U(S(offer.return_date)),
      return_time: U(S(offer.return_time)),

      notes: U(
        [S(offer.notes) || "", S(offer.customer_phone) ? `Telefon: ${S(offer.customer_phone)}` : ""]
          .filter(Boolean)
          .join("\n")
      ),
    });

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error("[offert/send-offer] error:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Serverfel" });
  }
}
