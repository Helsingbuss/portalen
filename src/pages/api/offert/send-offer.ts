// src/pages/api/offert/send-offer.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { sendOfferMail } from "@/lib/sendOfferMail";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const b = (req.body ?? {}) as any;

    // Stöd både gamla och nya fält
    const offerId: string | undefined =
      b.offerId ?? b.offer_id ?? b.id ?? undefined;
    const offerNumber: string | undefined =
      b.offerNumber ?? b.offer_number ?? undefined;
    const customerEmail: string | undefined =
      b.customerEmail ?? b.to ?? b.email ?? undefined;

    if (!offerId || !offerNumber || !customerEmail) {
      return res
        .status(400)
        .json({ error: "offerId, offerNumber och customerEmail krävs" });
    }

    await sendOfferMail({
      offerId: String(offerId),
      offerNumber: String(offerNumber),
      customerEmail: String(customerEmail),

      // valfria fält – skickas om de finns
      customerName: b.customerName ?? b.customer_name ?? null,
      customerPhone: b.customerPhone ?? b.customer_phone ?? null,

      from: b.from ?? b.departure_place ?? null,
      to: b.toPlace ?? b.to ?? b.destination ?? null,
      date: b.date ?? b.departure_date ?? null,
      time: b.time ?? b.departure_time ?? null,
      passengers:
        typeof b.passengers === "number"
          ? b.passengers
          : b.passengers
          ? Number(b.passengers)
          : null,
      via: b.via ?? null,
      onboardContact: b.onboardContact ?? null,

      return_from: b.return_from ?? b.return_departure ?? null,
      return_to: b.return_to ?? b.return_destination ?? null,
      return_date: b.return_date ?? null,
      return_time: b.return_time ?? null,

      notes: b.notes ?? null,
    });

    return res.status(200).json({ success: true, message: "Email sent" });
  } catch (error: any) {
    console.error("send-offer API error:", error);
    return res.status(500).json({ success: false, error: error?.message || "Serverfel" });
  }
}
