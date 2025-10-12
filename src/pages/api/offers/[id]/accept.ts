// src/pages/api/offers/[id]/accept.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabaseClient";
import { sendOfferMail } from "@/lib/sendMail";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query as { id?: string };
  const { customerEmail, offerNumber } = (req.body || {}) as {
    customerEmail?: string;
    offerNumber?: string;
  };

  if (!id || !offerNumber || !customerEmail) {
    return res.status(400).json({ error: "id, offerNumber and customerEmail required" });
  }

  try {
    // Uppdatera status i Supabase
    const { error } = await supabase
      .from("offers")
      .update({
        status: "godkand",
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;

    // Skicka notifieringar (ignorera eventuella mailfel – ordern är ändå godkänd)
    try {
      await sendOfferMail(customerEmail, offerNumber, "godkand");
      await sendOfferMail("offert@helsingbuss.se", offerNumber, "godkand");
    } catch {}

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
