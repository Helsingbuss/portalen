// src/pages/api/offers/approve.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { offerId } = req.body;

    if (!offerId) {
      return res.status(400).json({ error: "offerId saknas" });
    }

    const { error } = await supabaseAdmin
      .from("offers")
      .update({
        customer_approved: true,
        customer_approved_at: new Date().toISOString(),
      })
      .eq("id", offerId);

    if (error) {
      console.error("APPROVE OFFER ERROR", error);
      return res.status(500).json({ error: "Kunde inte uppdatera offert." });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("APPROVE OFFER ERROR", err);
    return res.status(500).json({ error: "Internt fel." });
  }
}
