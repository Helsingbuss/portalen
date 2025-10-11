// src/pages/api/offers/send-proposal.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabaseClient";
import { sendOfferMail } from "@/lib/sendMail";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      offerId,         // UUID i tabellen offers
      offerNumber,     // t.ex. HB25007
      customerEmail,   // mottagare
      totals,          // (valfritt) summering från kalkylen
      pricing,         // (valfritt) radrader
      input,           // (valfritt) inmatade fält
    } = req.body ?? {};

    if (!offerId || !offerNumber || !customerEmail) {
      return res.status(400).json({ error: "offerId, offerNumber och customerEmail krävs" });
    }

    // Spara kalkyl och markera offerten som besvarad
    await supabase
      .from("offers")
      .update({
        calc_totals: totals ?? null,
        calc_pricing: pricing ?? null,
        calc_input: input ?? null,
        status: "besvarad",
      })
      .eq("id", offerId);

    // Skicka mail till kund med din befintliga helper (3 argument, giltig status)
    await sendOfferMail(customerEmail, offerNumber, "besvarad");

    // (valfritt) notifiera admin
    await sendOfferMail("offert@helsingbuss.se", offerNumber, "besvarad");

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("send-proposal error:", err);
    return res.status(500).json({ error: err?.message || "Serverfel" });
  }
}
