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
      offerId,            // db id (uuid)
      offerNumber,        // t.ex. HB25007
      customerEmail,      // mottagare
      totals,             // summering från kalkylen (valfritt, sparas nedan)
      pricing,            // radlista från kalkylen (valfritt)
      input,              // inmatade fält (valfritt)
    } = req.body ?? {};

    if (!offerId || !offerNumber || !customerEmail) {
      return res.status(400).json({ error: "offerId, offerNumber och customerEmail krävs" });
    }

    // (valfritt) spara kalkyl i offers – utan att bryta något befintligt
    await supabase
      .from("offers")
      .update({
        // Spara som JSON-kolumner om de finns i din DB, annars ignoreras de tyst
        calc_totals: totals ?? null,
        calc_pricing: pricing ?? null,
        calc_input: input ?? null,
        status: "prisforslag", // markera att prisförslag har skickats
      })
      .eq("id", offerId);

    // Skicka mail till kund med din existerande helper (3 argument)
    await sendOfferMail(customerEmail, offerNumber, "prisforslag");

    // (valfritt) notifiera adminlådan
    await sendOfferMail("offert@helsingbuss.se", offerNumber, "prisforslag");

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("send-proposal error:", err);
    return res.status(500).json({ error: err?.message || "Serverfel" });
  }
}
