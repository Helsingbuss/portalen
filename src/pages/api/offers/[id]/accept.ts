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
        updated_at: new Date().toISOString(),
      })
      .eq("id", offerId);

    if (!error) return status;

    // om annat fel än constraint/kolumn/status → kasta direkt
    if (!/status|check|column|accepted_at|updated_at/i.test(error.message || "")) {
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
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  try {
    // 🔑 Hämta ID korrekt från:
    // 1. body.id vid POST
    // 2. route-param /api/offers/[id]/accept
    // 3. query ?id=
    const routeId =
      typeof req.query.id === "string"
        ? req.query.id
        : Array.isArray(req.query.id)
          ? req.query.id[0]
          : "";

    const bodyId =
      req.method === "POST" && req.body?.id
        ? String(req.body.id)
        : "";

    const queryId =
      typeof req.query.offer_id === "string"
        ? req.query.offer_id
        : "";

    const idOrNumber = String(bodyId || routeId || queryId || "").trim();

    const customerEmail =
      req.method === "POST" && req.body?.customerEmail
        ? String(req.body.customerEmail)
        : undefined;

    if (!idOrNumber) {
      return res.status(400).json({
        ok: false,
        error: "Missing id",
      });
    }

    // 🔍 Hämta offert
    const { data: offer, error } = await supabase
      .from("offers")
      .select("*")
      .or(`id.eq.${idOrNumber},offer_number.eq.${idOrNumber}`)
      .maybeSingle();

    if (error) {
      console.error("Fetch error:", error);

      return res.status(500).json({
        ok: false,
        error: error.message,
      });
    }

    if (!offer) {
      return res.status(404).json({
        ok: false,
        error: "Offer not found",
      });
    }

    // ✅ Uppdatera status
    const finalStatus = await acceptWithFallback(String(offer.id));

    // 📧 Mail
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

    // ✅ Redirect för kund när någon öppnar accept-länken direkt
    if (req.method === "GET") {
      return res.redirect(
        302,
        `/offert/${offer.offer_number || offer.id}?accepted=1`
      );
    }

    // ✅ API-svar för frontend/system
    return res.status(200).json({
      ok: true,
      status: finalStatus,
      offer_id: offer.id,
      offer_number: offer.offer_number,
    });
  } catch (e: any) {
    console.error("Accept error:", e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Server error",
    });
  }
}
