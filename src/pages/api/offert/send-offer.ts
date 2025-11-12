// src/pages/api/offert/send-offer.ts
import type { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabaseAdmin";
import { sendOfferMail, type SendOfferParams } from "@/lib/sendMail";

/**
 * POST /api/offert/send-offer
 * Body kan vara något av:
 *  - { offerId: string }                       // hämta allt från DB + skicka till kund & admin
 *  - { offer_number: "HB25xxx" }               // samma som ovan, hämtar via offer_number
 *  - { to: "kund@ex.se", offerId: "..." }      // tvinga mottagare
 *  - { to, offerNumber, ...övriga fält }       // skicka direkt utan DB (om du vill)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const b = (req.body || {}) as Record<string, any>;

    // 1) Om fulla mail-parametrar redan skickas in → skicka direkt
    if (b.offerNumber && b.customerEmail) {
      const p: SendOfferParams = {
        offerId: String(b.offerId || b.offerNumber),
        offerNumber: String(b.offerNumber),
        customerEmail: String(b.customerEmail),

        customerName: b.customerName ?? null,
        customerPhone: b.customerPhone ?? null,
        from: b.from ?? null,
        to: b.to ?? null,
        date: b.date ?? null,
        time: b.time ?? null,
        passengers: isFinite(+b.passengers) ? +b.passengers : null,
        via: b.via ?? null,
        onboardContact: b.onboardContact ?? null,
        return_from: b.return_from ?? null,
        return_to: b.return_to ?? null,
        return_date: b.return_date ?? null,
        return_time: b.return_time ?? null,
        notes: b.notes ?? null,
      };

      const out = await sendOfferMail(p);
      return res.status(200).json({ ok: true, sent: true, provider: out.provider });
    }

    // 2) Annars: hämta från DB via offerId eller offer_number
    const offerId = b.offerId ?? b.id ?? null;
    const offerNo = b.offer_number ?? b.offerNumber ?? null;

    if (!offerId && !offerNo) {
      return res.status(400).json({
        ok: false,
        error: "Saknar offerId eller offer_number i body.",
      });
    }

    // Hämta rad
    let row: any | null = null;

    if (offerId) {
      const q = await supabase
        .from("offers")
        .select("*")
        .eq("id", offerId)
        .single();
      if (q.error) throw q.error;
      row = q.data;
    } else {
      const q = await supabase
        .from("offers")
        .select("*")
        .eq("offer_number", offerNo)
        .maybeSingle();
      if (q.error) throw q.error;
      row = q.data;
    }

    if (!row) {
      return res.status(404).json({ ok: false, error: "Offert hittades inte." });
    }

    // 3) Mappa DB -> SendOfferParams
    const recipient =
      b.to ||
      row.contact_email ||
      row.customer_email ||
      null;

    if (!recipient) {
      return res.status(400).json({
        ok: false,
        error: "Ingen mottagaradress (customer_email/contact_email) hittades.",
      });
    }

    const p: SendOfferParams = {
      offerId: String(row.id ?? row.offer_number),
      offerNumber: String(row.offer_number ?? row.id),
      customerEmail: String(recipient),

      customerName: row.contact_person ?? row.customer_reference ?? null,
      customerPhone: row.contact_phone ?? null,

      from: row.departure_place ?? null,
      to: row.destination ?? null,
      date: row.departure_date ?? null, // redan YYYY-MM-DD i din modell
      time: row.departure_time ?? null,
      passengers: row.passengers ?? null,
      via: row.stopover_places ?? row.via ?? null,
      onboardContact: row.onboard_contact ?? null,

      return_from: row.return_departure ?? null,
      return_to: row.return_destination ?? null,
      return_date: row.return_date ?? null,
      return_time: row.return_time ?? null,

      notes: row.notes ?? null,
    };

    const out = await sendOfferMail(p);
    return res.status(200).json({ ok: true, sent: true, provider: out.provider });
  } catch (err: any) {
    console.error("[offert/send-offer] error:", err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || "Server error" });
  }
}
