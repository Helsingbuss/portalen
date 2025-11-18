// src/pages/api/offert/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabaseAdmin";
import { sendOfferMail, sendCustomerReceipt } from "@/lib/sendMail";



type ApiOk = { ok: true; offer: any };
type ApiErr = { error: string };

const S = (v: any) => (v == null ? null : String(v).trim() || null);
const U = <T extends string | number | null | undefined>(v: T) =>
  (v == null ? undefined : (v as Exclude<T, null>));

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiOk | ApiErr>
) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const body = req.body || {};
    const row = {
      status: "inkommen",

      contact_person: S(body.contact_person),
      customer_email: S(body.customer_email),
      customer_phone: S(body.customer_phone),

      customer_reference: S(body.customer_reference) || S(body.contact_person),
      customer_name: S(body.customer_name) || S(body.contact_person),
      customer_type: S(body.customer_type) || "privat",
      invoice_ref: S(body.invoice_ref),

      departure_place: S(body.departure_place),
      destination: S(body.destination),
      departure_date: S(body.departure_date),
      departure_time: S(body.departure_time),
      via: S(body.stopover_places) || S(body.via),
      stop: S(body.stop) || null,

      return_departure: S(body.return_departure),
      return_destination: S(body.return_destination),
      return_date: S(body.return_date),
      return_time: S(body.return_time),

      passengers: typeof body.passengers === "number" ? body.passengers : Number(body.passengers || 0) || null,
      notes: S(body.notes),
    };

    const { data, error } = await supabase.from("offers").insert(row).select("*").single();
    if (error) return res.status(500).json({ error: error.message });
    if (!data)  return res.status(500).json({ error: "Insert failed" });

    const offer = data;

    // 1) Admin-mail
    try {
      await sendOfferMail({
        offerId: String(offer.id),
        offerNumber: String(offer.offer_number || "HB25???"),

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

        notes: U(S(offer.notes)),
      });
    } catch (e: any) {
      console.error("[offert/create] sendOfferMail failed:", e?.message || e);
    }

    // 2) Kund-kvittens
    try {
      const to = S(offer.customer_email);
      if (to && to.includes("@")) {
        await sendCustomerReceipt({
          to,
          offerNumber: String(offer.offer_number || "HB25???"),
          from: U(S(offer.departure_place)) || undefined,
          toPlace: U(S(offer.destination)) || undefined,   // <— uppdaterat namn
          date: U(S(offer.departure_date)) || undefined,
          time: U(S(offer.departure_time)) || undefined,
          passengers: typeof offer.passengers === "number" ? offer.passengers : undefined,
        });
      }
    } catch (e: any) {
      console.error("[offert/create] sendCustomerReceipt failed:", e?.message || e);
    }

    return res.status(200).json({ ok: true, offer });
  } catch (e: any) {
    console.error("[offert/create] error:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
