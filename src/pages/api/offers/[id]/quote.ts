import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabaseClient";
import { sendOfferMail } from "@/lib/sendOfferMail";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

  try {
    const { data: offer, error: fetchErr } = await supabase
      .from("offers")
      .select("id, offer_number, customer_email, contact_email, status")
      .eq("id", id)
      .single();

    if (fetchErr || !offer) {
      return res.status(404).json({ error: "Offert hittades inte" });
    }

    const patch: any = {
      amount_ex_vat: breakdown?.grandExVat ?? null,
      vat_amount: breakdown?.grandVat ?? null,
      total_amount: breakdown?.grandTotal ?? null,
      calc_json: input ?? null,
      vat_breakdown: breakdown ?? null,
      updated_at: new Date().toISOString(),
    };

    if (mode === "send") {
      patch.status = "besvarad";
      patch.sent_at = new Date().toISOString();
    }

    const { error: updErr } = await supabase.from("offers").update(patch).eq("id", id);
    if (updErr) throw updErr;

    if (mode === "send" && offer.offer_number) {
      const to = (offer as any).customer_email || (offer as any).contact_email || null;
      if (to) {
        try {
          await sendOfferMail({
            offerId: String(offer.id),
            offerNumber: String(offer.offer_number),
            customerEmail: String(to), // CAMELCASE
          });
        } catch (mailErr) {
          console.error("sendOfferMail failed:", mailErr);
        }
      }
    }

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error("quote.ts error:", e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
