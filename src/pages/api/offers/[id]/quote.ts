// src/pages/api/offers/[id]/quote.ts
import type { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabaseAdmin";
import { sendOfferMail } from "@/lib/sendMail";

type CanonLeg = { subtotExVat: number; vat: number; total: number };
type CanonBreakdown = {
  grandExVat: number;
  grandVat: number;
  grandTotal: number;
  serviceFeeExVat?: number;
  legs?: CanonLeg[];
};

function num(x: any): number {
  const n = typeof x === "number" ? x : Number(x);
  return Number.isFinite(n) ? n : 0;
}

function normalizeBreakdown(input: any, breakdown: any, totals: any): CanonBreakdown {
  const buses = Math.max(1, num(input?.pricing?.numBuses || input?.pricing?.busesCount || 1));

  // CASE A: redan i "kanoniskt" format
  if (
    breakdown &&
    typeof breakdown === "object" &&
    typeof breakdown.grandTotal === "number" &&
    Array.isArray(breakdown.legs) &&
    breakdown.legs[0] &&
    "subtotExVat" in breakdown.legs[0]
  ) {
    return {
      grandExVat: num(breakdown.grandExVat),
      grandVat: num(breakdown.grandVat),
      grandTotal: num(breakdown.grandTotal),
      serviceFeeExVat: breakdown.serviceFeeExVat != null ? num(breakdown.serviceFeeExVat) : undefined,
      legs: breakdown.legs.map((l: any) => ({
        subtotExVat: num(l.subtotExVat),
        vat: num(l.vat),
        total: num(l.total),
      })),
    };
  }

  // CASE B: OfferCalculator-format (legs: [{exVat, vat, total} ...], totals: {exVat, vat, total})
  const canon: CanonBreakdown = {
    grandExVat: 0,
    grandVat: 0,
    grandTotal: 0,
    legs: [],
  };

  // totals i första hand
  const tEx = totals?.exVat ?? totals?.grandExVat ?? breakdown?.allBusesFinal?.exVat;
  const tVat = totals?.vat ?? totals?.grandVat ?? breakdown?.allBusesFinal?.vat;
  const tTot = totals?.total ?? totals?.grandTotal ?? breakdown?.allBusesFinal?.total;

  canon.grandExVat = num(tEx);
  canon.grandVat = num(tVat);
  canon.grandTotal = num(tTot);

  // legs -> konvertera till formatet som kundvyn läser (subtotExVat/vat/total)
  if (Array.isArray(breakdown?.legs)) {
    canon.legs = breakdown.legs
      .filter(Boolean)
      .map((l: any) => ({
        // Calculator-legs är oftast per buss – skala till hela uppdraget
        subtotExVat: num(l.exVat) * buses,
        vat: num(l.vat) * buses,
        total: num(l.total) * buses,
      }));
  }

  // serviceFee (valfri)
  if (input?.pricing?.includeServiceFee) {
    canon.serviceFeeExVat = num(input?.pricing?.serviceFee);
  }

  return canon;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { id } = req.query as { id?: string };
  if (!id) return res.status(400).json({ error: "Missing id" });

  const body = (req.body ?? {}) as any;
  const idOrNumber = String(id);

  // mode kan saknas (OfferCalculator saveDraft) -> default "draft"
  const mode: "draft" | "send" = body?.mode === "send" ? "send" : "draft";
  const input = body?.input ?? null;
  const breakdownRaw = body?.breakdown ?? null;
  const totalsRaw = body?.totals ?? null;

  const bodyCustomerEmail =
    typeof body?.customerEmail === "string" ? body.customerEmail : undefined;

  try {
    // ==== 1) Hämta offerten ====
    const looksLikeUuid = idOrNumber.includes("-") && idOrNumber.length >= 30;

    let query = supabase
      .from("offers")
      .select(
        `
        id,
        offer_number,
        contact_email,
        contact_person,
        customer_email,
        customer_phone,
        departure_place,
        destination,
        departure_date,
        departure_time,
        passengers,
        notes,
        status,
        return_departure,
        return_destination,
        return_date,
        return_time
      `
      )
      .limit(1);

    query = looksLikeUuid ? query.eq("id", idOrNumber) : query.eq("offer_number", idOrNumber);

    const { data: offer, error: fetchErr } = await query.maybeSingle();

    if (fetchErr || !offer) {
      console.error("quote.ts – fetch error:", fetchErr, "idOrNumber=", idOrNumber);
      return res.status(404).json({ error: "Offert hittades inte" });
    }

    const canonBreakdown = normalizeBreakdown(input, breakdownRaw, totalsRaw);

    // Om totals ändå blir 0 men du har data – försök fallback
    if (canonBreakdown.grandTotal === 0 && breakdownRaw?.allBusesFinal?.total) {
      canonBreakdown.grandTotal = num(breakdownRaw.allBusesFinal.total);
    }

    // ==== 2) Spara kalkyl / totals / metadata ====
    const patch: any = {
      amount_ex_vat: canonBreakdown.grandExVat ?? null,
      vat_amount: canonBreakdown.grandVat ?? null,
      total_amount: canonBreakdown.grandTotal ?? null,
      calc_json: input ?? null,
      vat_breakdown: canonBreakdown ?? null,
      updated_at: new Date().toISOString(),
    };

    if (mode === "send") {
      patch.status = "besvarad";
      patch.sent_at = new Date().toISOString();
    }

    const { error: updErr } = await supabase
      .from("offers")
      .update(patch)
      .eq("id", offer.id);

    if (updErr) {
      console.error("quote.ts – update error:", updErr);
      throw updErr;
    }

    // ==== 3) Skicka mail endast vid "send" ====
    if (mode === "send" && offer.offer_number) {
      try {
        // ✅ Prioritera customerEmail från body, sen customer_email, sist contact_email
        const customerEmail: string | undefined =
          bodyCustomerEmail ||
          (offer.customer_email as string | undefined) ||
          (offer.contact_email as string | undefined) ||
          undefined;

        if (customerEmail) {
          await sendOfferMail({
            kind: "customer_price_proposal",
            offerId: String(offer.id),
            offerNumber: offer.offer_number,
            customerEmail,
            customerName: (offer.contact_person as string | undefined) || undefined,
            from: (offer.departure_place as string | undefined) ?? undefined,
            to: (offer.destination as string | undefined) ?? undefined,
            date: (offer.departure_date as string | undefined) ?? undefined,
            time: (offer.departure_time as string | undefined) ?? undefined,
            passengers: typeof offer.passengers === "number" ? offer.passengers : undefined,
            notes: (offer.notes as string | undefined) ?? null,
            return_from: (offer.return_departure as string | undefined) ?? null,
            return_to: (offer.return_destination as string | undefined) ?? null,
            return_date: (offer.return_date as string | undefined) ?? null,
            return_time: (offer.return_time as string | undefined) ?? null,
            subject: `Prisförslag för din resa – ${offer.offer_number}`,
          });
        }
      } catch (mailErr) {
        console.error("sendOfferMail failed:", mailErr);
        // Ignorera mailfel – kalkylen är ändå sparad
      }
    }

    return res.status(200).json({ ok: true, saved: patch });
  } catch (e: any) {
    console.error("quote.ts error:", e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
