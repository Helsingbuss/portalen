// src/pages/api/offers/[id]/quote.ts
import type { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabaseAdmin"; // admin-klient (service key)
import { sendOfferMail } from "@/lib/sendMail";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query as { id?: string };
  if (!id) return res.status(400).json({ error: "Missing id" });

  const { mode, input, breakdown } = (req.body ?? {}) as {
    mode: "draft" | "send";
    input: any;
    breakdown: {
      grandExVat: number;
      grandVat: number;
      grandTotal: number;
      serviceFeeExVat: number;
      legs: { subtotExVat: number; vat: number; total: number }[];
    };
  };

  const idOrNumber = String(id);

  try {
    // ==== 1) Hämta offerten ====
    // Stöder både UUID (id) och offertnummer (offer_number)
    const looksLikeUuid =
      idOrNumber.includes("-") && idOrNumber.length >= 30; // väldigt enkel check

    let query = supabase
      .from("offers")
      .select(
        `
        id,
        offer_number,
        contact_email,
        contact_person,
        customer_email,
        departure_place,
        destination,
        departure_date,
        departure_time,
        passengers,
        pax,
        status
      `
      )
      .limit(1);

    if (looksLikeUuid) {
      query = query.eq("id", idOrNumber);
    } else {
      query = query.eq("offer_number", idOrNumber);
    }

    const { data: offer, error: fetchErr } = await query.maybeSingle();

    if (fetchErr || !offer) {
      console.error("quote.ts – fetch error:", fetchErr, "idOrNumber=", idOrNumber);
      return res.status(404).json({ error: "Offert hittades inte" });
    }

    // ==== 2) Spara kalkyl / totals / metadata ====
    const patch: any = {
      amount_ex_vat: breakdown?.grandExVat ?? null,
      vat_amount: breakdown?.grandVat ?? null,
      total_amount: breakdown?.grandTotal ?? null,
      calc_json: input ?? null,
      vat_breakdown: breakdown ?? null,
      updated_at: new Date().toISOString(),
    };

    if (mode === "send") {
      // Markera som besvarad när vi skickar prisförslag
      patch.status = "besvarad";
      patch.sent_at = new Date().toISOString();
    }

    const { error: updErr } = await supabase
      .from("offers")
      .update(patch)
      .eq("id", offer.id); // använd alltid verkliga UUID:t från raden

    if (updErr) {
      console.error("quote.ts – update error:", updErr);
      throw updErr;
    }

    // ==== 3) Skicka mail endast vid "send" ====
    if (mode === "send" && offer.offer_number) {
      try {
        const customerEmail: string | undefined =
          (offer.contact_email as string | undefined) ||
          (offer.customer_email as string | undefined) ||
          undefined;

        const passengers =
          typeof offer.passengers === "number"
            ? offer.passengers
            : typeof offer.pax === "number"
            ? offer.pax
            : undefined;

        await sendOfferMail({
          offerId: String(offer.id),
          offerNumber: offer.offer_number ?? String(offer.id),
          customerEmail,
          customerName:
            (offer.contact_person as string | undefined) || undefined,
          from:
            (offer.departure_place as string | undefined) ?? undefined,
          to: (offer.destination as string | undefined) ?? undefined,
          date:
            (offer.departure_date as string | undefined) ?? undefined,
          time:
            (offer.departure_time as string | undefined) ?? undefined,
          passengers,
          subject: `Offert ${offer.offer_number} har besvarats`,
        });
      } catch (mailErr) {
        console.error("sendOfferMail failed:", mailErr);
        // Ignorera mailfel – kalkylen är ändå sparad
      }
    }

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error("quote.ts error:", e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
