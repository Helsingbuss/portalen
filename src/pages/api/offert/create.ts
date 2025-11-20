import type { NextApiRequest, NextApiResponse } from "next";
import admin from "@/lib/supabaseAdmin";
import { nextOfferNumber } from "@/lib/offerNumber";
import { sendOfferMail, sendCustomerReceipt } from "@/lib/sendMail";

export const config = { runtime: "nodejs" };

type ApiOk  = { ok: true; offer: any };
type ApiErr = { error: string };

const S = (v: any) => (v == null ? null : String(v).trim() || null);
const U = <T extends string | number | null | undefined>(v: T) =>
  (v == null ? undefined : (v as Exclude<T, null>));

// tillåt Fluent Forms preflight
function setCors(res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Webhook-Token");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiOk | ApiErr>
) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST")  return res.status(405).json({ error: "Method not allowed" });

  try {
    // (valfritt) enkel token för WP-webhook
    const mustHave = process.env.WEBHOOK_TOKEN;
    if (mustHave && req.headers["x-webhook-token"] !== mustHave) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const b = (req.body ?? {}) as Record<string, any>;

    // mappa Fluent Forms-fälten -> DB-kolumner
    const row: any = {
      status: "inkommen",

      contact_person:     S(b.contact_person),
      customer_email:     S(b.customer_email),
      customer_phone:     S(b.customer_phone),

      customer_reference: S(b.customer_reference) || S(b.contact_person),
      customer_name:      S(b.customer_name)      || S(b.Namn_efternamn) || S(b.contact_person),
      customer_type:      S(b.customer_type)      || "privat",
      invoice_ref:        S(b.Referens_PO_nummer) || S(b.invoice_ref),

      departure_place: S(b.departure_place),
      destination:     S(b.destination),
      departure_date:  S(b.departure_date),
      departure_time:  S(b.departure_time),
      via:             S(b.via) || S(b.stopover_places),
      stop:            S(b.stop),

      // retur-fält (stöder båda namnen)
      return_departure:   S(b.return_departure)   || S(b.return_from),
      return_destination: S(b.return_destination) || S(b.final_destination) || S(b.return_to),
      return_date:        S(b.return_date),
      return_time:        S(b.return_time),

      passengers: typeof b.passengers === "number"
        ? b.passengers
        : Number(b.passengers || 0) || null,

      // lägg diverse extra i notes
      notes: [ S(b.notes), S(b.behöver_buss), S(b.basplats_pa_destination) ]
        .filter(Boolean).join("\n") || null
    };

    // generera offertnummer
    row.offer_number = await nextOfferNumber(admin);

    // Insert
    const { data, error } = await admin.from("offers").insert(row).select("*").single();
    if (error || !data) return res.status(500).json({ error: error?.message || "Insert failed" });

    const offer = data;

    // Mail till admin + kvitto till kund
    try {
      await sendOfferMail({
        offerId: String(offer.id),
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
      console.error("[offert/create] sendOfferMail:", e?.message || e);
    }

    try {
      const to = S(offer.customer_email);
      if (to && to.includes("@")) {
        await sendCustomerReceipt({ to, offerNumber: String(offer.offer_number) });
      }
    } catch (e:any) {
      console.error("[offert/create] sendCustomerReceipt:", e?.message || e);
    }

    return res.status(200).json({ ok: true, offer });
  } catch (e:any) {
    console.error("[offert/create] error:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
