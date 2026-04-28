// src/pages/api/offers/[id]/accept.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";
import { sendOfferMail } from "@/lib/sendMail";

const supabase =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

// Försök med flera statusvärden
async function acceptWithFallback(offerId: string) {
  const variants = [
    { status: "godkänd", stampField: "accepted_at" as const },
    { status: "godkand", stampField: "accepted_at" as const },
    { status: "accepted", stampField: "accepted_at" as const },
    { status: "bokad", stampField: "accepted_at" as const },
    { status: "booked", stampField: "accepted_at" as const },
  ];

  for (const v of variants) {
    const payload: any = { status: v.status };
    payload[v.stampField] = new Date().toISOString();

    const { error } = await supabase
      .from("offers")
      .update(payload)
      .eq("id", offerId);

    if (!error) return v.status;
  }

  throw new Error("Kunde inte uppdatera status");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // ✅ FIX: tillåt GET + POST
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const idOrNumber =
      req.method === "POST"
        ? req.body.id
        : req.query.id;

    const customerEmail =
      req.method === "POST"
        ? req.body.customerEmail
        : undefined;

    if (!idOrNumber) {
      return res.status(400).json({ error: "Missing id" });
    }

    // Hämta offert
    const { data: offer, error } = await supabase
      .from("offers")
      .select("*")
      .or(`id.eq.${idOrNumber},offer_number.eq.${idOrNumber}`)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!offer) {
      return res.status(404).json({ error: "Offer not found" });
    }

    const finalStatus = await acceptWithFallback(String(offer.id));

    // 📧 Skicka mail
    const to =
      customerEmail ||
      offer.contact_email ||
      offer.customer_email ||
      undefined;

    if (to) {
      await sendOfferMail({
        offerId: String(offer.id),
        offerNumber: offer.offer_number ?? String(offer.id),
        customerEmail: to,
        customerName: offer.contact_person ?? undefined,
        from: offer.departure_place ?? undefined,
        to: offer.destination ?? undefined,
        date: offer.departure_date ?? undefined,
        time: offer.departure_time ?? undefined,
        passengers: offer.passengers ?? null,
        subject: `Er offert ${offer.offer_number ?? ""} är nu ${finalStatus}`,
      });
    }

    // ✅ NICE UX: redirect om GET (kund klick)
    if (req.method === "GET") {
      return res.redirect(
        `/offert/${offer.offer_number}?accepted=true`
      );
    }

    return res.status(200).json({
      ok: true,
      status: finalStatus,
    });

  } catch (e: any) {
    return res.status(500).json({
      error: e?.message || "Server error",
    });
  }
}
