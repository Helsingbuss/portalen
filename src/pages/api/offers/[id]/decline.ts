// src/pages/api/offers/[id]/decline.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";
import { sendOfferMail } from "@/lib/sendOfferMail";

const supabase =
  (admin as any).supabaseAdmin || (admin as any).supabase || (admin as any).default;

async function declineWithFallback(offerId: string) {
  const variants = [
    { status: "makulerad", stampField: "declined_at" as const },
    { status: "avböjd", stampField: "declined_at" as const },
    { status: "avbojd", stampField: "declined_at" as const },
    { status: "declined", stampField: "declined_at" as const },
    { status: "rejected", stampField: "declined_at" as const },
    { status: "cancelled", stampField: "declined_at" as const },
    { status: "canceled", stampField: "declined_at" as const },
  ];
  const tried: string[] = [];
  for (const v of variants) {
    const payload: any = { status: v.status };
    payload[v.stampField] = new Date().toISOString();
    const { error } = await supabase.from("offers").update(payload).eq("id", offerId);
    if (!error) return v.status;
    const msg = String(error.message || "");
    tried.push(v.status);
    if (!/status|check/i.test(msg)) throw new Error(error.message);
  }
  throw new Error(
    `Inget av statusvärdena tillåts av offers_status_check. Testade: ${tried.join(", ")}`
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { id } = req.query as { id: string };
    const { customerEmail } = req.body as { customerEmail?: string };

    // Hämta offertraden
    const { data: offer, error } = await supabase.from("offers").select("*").eq("id", id).single();
    if (error || !offer) return res.status(404).json({ error: "Offer not found" });

    // Uppdatera status med fallback-variant
    const finalStatus = await declineWithFallback(offer.id);

    // Skicka mail (objekt-signatur)
    const to =
      customerEmail ||
      (offer as any).contact_email ||
      (offer as any).customer_email ||
      null;

    if (to) {
      await sendOfferMail({
        offerId: String(offer.id ?? offer.offer_number),
        offerNumber: String(offer.offer_number ?? offer.id),
        customerEmail: to,

        // valfria uppgifter för en trevligare mail-sammanfattning
        customerName: (offer as any).contact_person ?? null,
        customerPhone: (offer as any).contact_phone ?? null,

        // primär sträcka
        from: (offer as any).departure_place ?? null,
        to: (offer as any).destination ?? null,
        date: (offer as any).departure_date ?? null,
        time: (offer as any).departure_time ?? null,
        passengers:
          typeof (offer as any).passengers === "number" ? (offer as any).passengers : null,
        via: (offer as any).stopover_places ?? null,
        onboardContact: null,

        // retur om finns
        return_from: (offer as any).return_departure ?? null,
        return_to: (offer as any).return_destination ?? null,
        return_date: (offer as any).return_date ?? null,
        return_time: (offer as any).return_time ?? null,

        // övrigt
        notes: (offer as any).notes ?? null,
      });
    }

    return res.status(200).json({ ok: true, status: finalStatus });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
