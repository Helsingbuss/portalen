import type { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabaseAdmin"; // admin-klient (service key)
import { sendOfferMail } from "@/lib/sendMail";

type IncomingLeg = {
  subtotExVat?: number;
  exVat?: number;
  vat?: number;
  total?: number;
};

type IncomingBreakdown = {
  grandExVat?: number;
  grandVat?: number;
  grandTotal?: number;
  serviceFeeExVat?: number;
  legs?: IncomingLeg[];
};

function num(v: any): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query as { id?: string };
  if (!id) return res.status(400).json({ error: "Missing id" });

  const body = (req.body ?? {}) as {
    mode?: "draft" | "send";
    input?: any;
    breakdown?: IncomingBreakdown;
    customerEmail?: string;
  };

  const mode = body.mode === "send" ? "send" : "draft";
  const idOrNumber = String(id);

  try {
    // ==== 1) Hämta offerten (UUID eller offer_number) ====
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
        departure_place,
        destination,
        departure_date,
        departure_time,
        passengers,
        status
      `
      )
      .limit(1);

    query = looksLikeUuid ? query.eq("id", idOrNumber) : query.eq("offer_number", idOrNumber);

    const { data: offer, error: fetchErr } = await query.maybeSingle();

    if (fetchErr || !offer) {
      console.error("quote.ts – fetch error:", fetchErr, "idOrNumber=", idOrNumber);
      return res.status(404).json({ error: "Offert hittades inte" });
    }

    // ==== 2) Normalisera breakdown till det format vi vill spara ====
    const b = body.breakdown || {};

    const grandExVat = num(b.grandExVat);
    const grandVat = num(b.grandVat);
    const grandTotal = num(b.grandTotal);

    const legs = Array.isArray(b.legs)
      ? b.legs.map((l) => {
          const subtotExVat = num(l.subtotExVat ?? l.exVat) ?? 0;
          const vat = num(l.vat) ?? 0;
          const total = num(l.total) ?? subtotExVat + vat;
          return { subtotExVat, vat, total };
        })
      : [];

    const normalizedBreakdown = {
      grandExVat: grandExVat ?? null,
      grandVat: grandVat ?? null,
      grandTotal: grandTotal ?? null,
      serviceFeeExVat: num(b.serviceFeeExVat) ?? null,
      legs,
    };

    // ==== 3) Spara totals + calc_json + breakdown ====
    const patch: any = {
      amount_ex_vat: grandExVat ?? null,
      vat_amount: grandVat ?? null,
      total_amount: grandTotal ?? null,
      calc_json: body.input ?? null,
      vat_breakdown: normalizedBreakdown,
      updated_at: new Date().toISOString(),
    };

    // Om admin skickar in kund-email och DB saknar den, spara den
    if (body.customerEmail && !offer.customer_email) {
      patch.customer_email = body.customerEmail;
    }

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

    // ==== 4) Mail endast vid send ====
    if (mode === "send" && offer.offer_number) {
      try {
        const email =
          body.customerEmail ||
          (offer.contact_email as string | undefined) ||
          (offer.customer_email as string | undefined) ||
          undefined;

        if (email) {
          const passengers =
            typeof offer.passengers === "number" ? offer.passengers : undefined;

          await sendOfferMail({
            offerId: String(offer.id),
            offerNumber: offer.offer_number ?? String(offer.id),
            customerEmail: email,
            customerName: (offer.contact_person as string | undefined) || undefined,
            from: (offer.departure_place as string | undefined) ?? undefined,
            to: (offer.destination as string | undefined) ?? undefined,
            date: (offer.departure_date as string | undefined) ?? undefined,
            time: (offer.departure_time as string | undefined) ?? undefined,
            passengers,
            subject: `Offert ${offer.offer_number} har besvarats`,
          });
        }
      } catch (mailErr) {
        console.error("sendOfferMail failed:", mailErr);
        // ignorera mailfel – kalkylen är sparad
      }
    }

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error("quote.ts error:", e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
