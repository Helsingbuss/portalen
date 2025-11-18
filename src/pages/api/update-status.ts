// src/pages/api/update-status.ts
import type { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabaseAdmin";
import { sendOfferMail } from "@/lib/sendMail";

/** Kolumner vi använder från offers */
type OfferRow = {
  id: string;
  offer_number: string | null;
  status?: string | null;

  contact_person: string | null;
  customer_email: string | null;

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

function isOfferRow(d: any): d is OfferRow {
  return d && typeof d === "object" && typeof d.id === "string";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const body = (req.body ?? {}) as {
      offer_id?: string;
      status?: string | null;
      notes?: string | null;
      via?: string | null;
      stop?: string | null;
      return_departure?: string | null;
      return_destination?: string | null;
      return_date?: string | null;
      return_time?: string | null;
      notify?: boolean; // default: true
    };

    const id = String(body.offer_id || req.query.id || "").trim();
    if (!id) return res.status(400).json({ error: "Saknar offert-id" });

    const { data, error } = await supabase
      .from("offers")
      .select([
        "id",
        "offer_number",
        "status",
        "contact_person",
        "customer_email",
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

    const offer: OfferRow = data;

    // Patch status/notes
    const patch: Record<string, any> = {};
    if (typeof body.status === "string" && body.status.trim() !== "") patch.status = body.status;
    if (typeof body.notes === "string") patch.notes = body.notes;

    if (Object.keys(patch).length > 0) {
      const { error: uerr } = await supabase.from("offers").update(patch).eq("id", id);
      if (uerr) return res.status(500).json({ error: uerr.message });
      offer.status = patch.status ?? offer.status;
      offer.notes = patch.notes ?? offer.notes;
    }

    const viaOut  = body.via  ?? offer.via  ?? null;
    const stopOut = body.stop ?? offer.stop ?? null;

    const retFrom = body.return_departure   ?? offer.return_departure   ?? null;
    const retTo   = body.return_destination ?? offer.return_destination ?? null;
    const retDate = body.return_date        ?? offer.return_date        ?? null;
    const retTime = body.return_time        ?? offer.return_time        ?? null;

    const outNotes = body.notes ?? offer.notes ?? null;

    const shouldNotify = body.notify !== false;
    const hasEmail = !!S(offer.customer_email);

    if (shouldNotify && hasEmail) {
      await sendOfferMail({
        offerId: String(offer.id),
        offerNumber: String(offer.offer_number || "HB25???"),

        customerEmail: U(S(offer.customer_email)),
        customerName: U(S(offer.contact_person)),
        // OBS: ingen customerPhone i signaturen

        from: U(S(offer.departure_place)),
        to: U(S(offer.destination)),
        date: U(S(offer.departure_date)),
        time: U(S(offer.departure_time)),
        via: U(S(viaOut)),
        stop: U(S(stopOut)),
        passengers: typeof offer.passengers === "number" ? offer.passengers : undefined,

        return_from: U(S(retFrom)),
        return_to: U(S(retTo)),
        return_date: U(S(retDate)),
        return_time: U(S(retTime)),

        notes: U(S(outNotes)),
      });
    }

    return res.status(200).json({ ok: true, id, status: offer.status ?? null });
  } catch (e: any) {
    console.error("[update-status] error:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Serverfel" });
  }
}
