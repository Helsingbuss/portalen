// src/pages/api/offert/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabaseAdmin";
import { sendOfferMail, sendCustomerReceipt } from "@/lib/sendMail";

export const config = { runtime: "nodejs" };

type ApiOk  = { ok: true; offer: any };
type ApiErr = { error: string };

const S = (v: any) => (v == null ? null : String(v).trim() || null);
const U = <T extends string | number | null | undefined>(v: T) =>
  (v == null ? undefined : (v as Exclude<T, null>));

/** Hämta nästa offertnummer för aktuellt år. Format: HB{YY}{NNNN}, minsta N=0009 */
async function nextOfferNumber(): Promise<string> {
  const yy = new Date().toISOString().slice(2, 4); // "25"
  const prefix = `HB${yy}`;
  // Hämta högsta existerande i år
  const { data, error } = await supabase
    .from("offers")
    .select("offer_number")
    .ilike("offer_number", `${prefix}%`)
    .order("offer_number", { ascending: false })
    .limit(1);

  let current = 8; // så att nästa blir 9 (HB{yy}0009)
  if (!error && Array.isArray(data) && data.length > 0) {
    const on = String(data[0].offer_number || "");
    const tail = on.slice(prefix.length);         // "0022"
    const n = parseInt(tail, 10);
    if (!Number.isNaN(n)) current = Math.max(current, n);
  }
  const next = current + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiOk | ApiErr>
) {
  // CORS (externa formulär)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST,OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const b = req.body || {};

    // Skapa offertrad
    const row: Record<string, any> = {
      status: "inkommen",

      contact_person:     S(b.contact_person),
      customer_email:     S(b.customer_email),
      customer_phone:     S(b.customer_phone),

      customer_reference: S(b.customer_reference) || S(b.contact_person),
      customer_name:      S(b.customer_name)      || S(b.contact_person),
      customer_type:      S(b.customer_type)      || "privat",
      invoice_ref:        S(b.invoice_ref),

      departure_place: S(b.departure_place),
      destination:     S(b.destination),
      departure_date:  S(b.departure_date),
      departure_time:  S(b.departure_time),
      via:             S(b.stopover_places) || S(b.via),
      stop:            S(b.stop),

      return_departure:   S(b.return_departure),
      return_destination: S(b.return_destination),
      return_date:        S(b.return_date),
      return_time:        S(b.return_time),

      passengers:
        typeof b.passengers === "number" ? b.passengers : Number(b.passengers || 0) || null,

      notes: S(b.notes),
    };

    // Tilldela nästa offertnummer (HB25 0009, 0010, …)
    row.offer_number = await nextOfferNumber();

    // Spara
    const { data, error } = await supabase
      .from("offers")
      .insert(row)
      .select("*")
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!data)  return res.status(500).json({ error: "Insert failed" });

    const offer = data;

    // ADMIN-mail + kundkvitto
    try {
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

        notes: U(S(offer.notes)),
      });
    } catch (e:any) {
      console.error("[offert/create] sendOfferMail failed:", e?.message || e);
    }

    try {
      const to = S(offer.customer_email);
      if (to && to.includes("@")) {
        await sendCustomerReceipt({
          to,
          offerNumber: String(offer.offer_number),
        });
      }
    } catch (e:any) {
      console.error("[offert/create] sendCustomerReceipt failed:", e?.message || e);
    }

    return res.status(200).json({ ok: true, offer });
  } catch (e:any) {
    console.error("[offert/create] error:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
