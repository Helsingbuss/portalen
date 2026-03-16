// src/pages/api/offers/[id]/quote.ts
import supabaseImport from "@/lib/supabaseAdmin";
import { sendOfferMail } from "@/lib/sendMail";

const supabase =
  (supabaseImport as any)?.supabaseAdmin ||
  (supabaseImport as any)?.supabase ||
  (supabaseImport as any)?.default ||
  supabaseImport;

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

function str(x: any): string | null {
  if (typeof x !== "string") return null;
  const v = x.trim();
  return v ? v : null;
}

function normalizeBreakdown(input: any, breakdown: any, totals: any): CanonBreakdown {
  const buses = Math.max(1, num(input?.pricing?.numBuses || input?.pricing?.busesCount || 1));

  // CASE A: redan i kanoniskt format
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
      serviceFeeExVat:
        breakdown.serviceFeeExVat != null ? num(breakdown.serviceFeeExVat) : undefined,
      legs: breakdown.legs.map((l: any) => ({
        subtotExVat: num(l.subtotExVat),
        vat: num(l.vat),
        total: num(l.total),
      })),
    };
  }

  // CASE B: äldre format
  const canon: CanonBreakdown = {
    grandExVat: 0,
    grandVat: 0,
    grandTotal: 0,
    legs: [],
  };

  const tEx = totals?.exVat ?? totals?.grandExVat ?? breakdown?.allBusesFinal?.exVat;
  const tVat = totals?.vat ?? totals?.grandVat ?? breakdown?.allBusesFinal?.vat;
  const tTot = totals?.total ?? totals?.grandTotal ?? breakdown?.allBusesFinal?.total;

  canon.grandExVat = num(tEx);
  canon.grandVat = num(tVat);
  canon.grandTotal = num(tTot);

  if (Array.isArray(breakdown?.legs)) {
    canon.legs = breakdown.legs
      .filter(Boolean)
      .map((l: any) => ({
        subtotExVat: num(l.exVat) * buses,
        vat: num(l.vat) * buses,
        total: num(l.total) * buses,
      }));
  }

  if (input?.pricing?.includeServiceFee) {
    canon.serviceFeeExVat = num(input?.pricing?.serviceFee);
  }

  return canon;
}

function extractPriceFields(body: any, canonBreakdown: CanonBreakdown, mode: "draft" | "send") {
  const meta = body?.priceMeta ?? {};

  const price_amount = num(meta.price_amount ?? body?.price_amount ?? canonBreakdown.grandTotal);
  const price_currency = str(meta.price_currency ?? body?.price_currency) || "SEK";
  const price_vat_included =
    str(meta.price_vat_included ?? body?.price_vat_included) ||
    (canonBreakdown.grandVat > 0 ? "Inkl. moms" : "Ingen moms (0%)");

  const internal_cost = num(
    meta.internal_cost ?? body?.internal_cost ?? canonBreakdown.grandExVat
  );

  const price_note =
    str(meta.price_note ?? body?.price_note) ||
    str(body?.input?.note) ||
    null;

  const valid_until = str(meta.valid_until ?? body?.valid_until) || null;

  const price_last_updated_at =
    str(meta.price_last_updated_at ?? body?.price_last_updated_at) ||
    new Date().toISOString();

  const price_status =
    str(meta.price_status ?? body?.price_status) ||
    (mode === "send" ? "Skickat prisförslag" : "Kalkyl sparad");

  return {
    price_amount,
    price_currency,
    price_vat_included,
    internal_cost,
    price_note,
    valid_until,
    price_last_updated_at,
    price_status,
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query as { id?: string };
  if (!id) {
    return res.status(400).json({ error: "Missing id" });
  }

  if (!supabase) {
    return res.status(500).json({ error: "Supabase är inte initierad korrekt." });
  }

  const body = (req.body ?? {}) as any;
  const idOrNumber = String(id);

  const mode: "draft" | "send" = body?.mode === "send" ? "send" : "draft";
  const input = body?.input ?? null;
  const breakdownRaw = body?.breakdown ?? null;
  const totalsRaw = body?.totals ?? null;

  const bodyCustomerEmail =
    typeof body?.customerEmail === "string" ? body.customerEmail : undefined;

  try {
    // 1) Hämta offerten
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

    if (canonBreakdown.grandTotal === 0 && breakdownRaw?.allBusesFinal?.total) {
      canonBreakdown.grandTotal = num(breakdownRaw.allBusesFinal.total);
    }

    const priceFields = extractPriceFields(body, canonBreakdown, mode);

    // 2) Spara kalkyl / totals / metadata
    const patch: any = {
      amount_ex_vat: canonBreakdown.grandExVat ?? null,
      vat_amount: canonBreakdown.grandVat ?? null,
      total_amount: canonBreakdown.grandTotal ?? null,
      calc_json: input ?? null,
      vat_breakdown: canonBreakdown ?? null,

      // Nya prisfält
      price_amount: priceFields.price_amount ?? null,
      price_currency: priceFields.price_currency ?? "SEK",
      price_vat_included: priceFields.price_vat_included ?? null,
      internal_cost: priceFields.internal_cost ?? null,
      price_note: priceFields.price_note ?? null,
      valid_until: priceFields.valid_until ?? null,
      price_last_updated_at: priceFields.price_last_updated_at ?? new Date().toISOString(),
      price_status: priceFields.price_status ?? null,

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

    // 3) Skicka mail endast vid send
    if (mode === "send" && offer.offer_number) {
      try {
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
      }
    }

    return res.status(200).json({
      ok: true,
      saved: {
        ...patch,
      },
    });
  } catch (e: any) {
    console.error("quote.ts error:", e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
