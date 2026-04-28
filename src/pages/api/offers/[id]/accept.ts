// src/pages/api/offers/[id]/accept.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";
import { sendOfferMail } from "@/lib/sendMail";

const supabase =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

// ✅ Robust status-update
async function acceptWithFallback(offerId: string) {
  const variants = [
    "godkänd",
    "godkand",
    "accepted",
    "bokad",
    "booked",
  ];

  for (const status of variants) {
    const { error } = await supabase
      .from("offers")
      .update({
        status,
        accepted_at: new Date().toISOString(),
      })
      .eq("id", offerId);

    if (!error) return status;

    // om annat fel än constraint → kasta direkt
    if (!/status|check/i.test(error.message || "")) {
      throw new Error(error.message);
    }
  }

  throw new Error("Kunde inte uppdatera status");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // ✅ Tillåt GET + POST
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // 🔑 Hämta ID korrekt beroende på metod
    const idOrNumber =
      req.method === "POST"
        ? req.body?.id
        : req.query?.id;

    const customerEmail =
      req.method === "POST"
        ? req.body?.customerEmail
        : undefined;

    if (!idOrNumber) {
      return res.status(400).json({ error: "Missing id" });
    }

    // 🔍 Hämta offert
    const { data: offer, error } = await supabase
      .from("offers")
      .select("*")
      .or(`id.eq.${idOrNumber},offer_number.eq.${idOrNumber}`)
      .maybeSingle();

    if (error) {
      console.error("Fetch error:", error);
      return res.status(500).json({ error: error.message });
    }

    if (!offer) {
      return res.status(404).json({ error: "Offer not found" });
    }

    // ✅ Uppdatera status
    const finalStatus = await acceptWithFallback(String(offer.id));

    // 📧 Mail (valfri men bra)
    const to =
      customerEmail ||
      offer.contact_email ||
      offer.customer_email ||
      undefined;

    if (to) {
      try {
        await sendOfferMail({
          offerId: String(offer.id),
          offerNumber: offer.offer_number ?? String(offer.id),
          customerEmail: to,
          customerName:
            offer.contact_person ??
            offer.customer_name ??
            undefined,
          from: offer.departure_place ?? undefined,
          to: offer.destination ?? undefined,
          date: offer.departure_date ?? undefined,
          time: offer.departure_time ?? undefined,
          passengers: offer.passengers ?? null,
          subject: `Er offert ${offer.offer_number ?? ""} är nu ${finalStatus}`,
        });
      } catch (mailErr) {
        console.warn("Mail failed (ignoreras):", mailErr);
      }
    }

    // ✅ 👉 VIKTIGT: redirect för kund (GET)
    if (req.method === "GET") {
      return res.redirect(
        302,
        `/offert/${offer.offer_number}?accepted=1`
      );
    }

    // ✅ API-svar för system (POST)
    return res.status(200).json({
      ok: true,
      status: finalStatus,
    });

  } catch (e: any) {
    console.error("Accept error:", e);
    return res.status(500).json({
      error: e?.message || "Server error",
    });
  }
}
