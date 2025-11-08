// src/pages/api/update-status.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabaseAdmin";
import { sendOfferMail } from "@/lib/sendOfferMail";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { customer_name, customer_email, customer_phone, notes } = req.body ?? {};

    if (!customer_email) {
      return res.status(400).json({ error: "customer_email saknas" });
    }

    // Skapa enkelt löpnummer (behåll ditt befintliga beteende)
    const offerNumber = `HB${Date.now().toString().slice(-5)}`;

    // Spara en enkel rad i offers (behåll fält du redan använder)
    const { data, error } = await supabase
      .from("offers")
      .insert([
        {
          offer_number: offerNumber,
          customer_reference: customer_name ?? null,
          contact_person: customer_name ?? null,
          contact_email: customer_email ?? null,
          contact_phone: customer_phone ?? null,
          notes: notes ?? null,
          status: "inkommen",
          offer_date: new Date().toISOString().slice(0, 10),
        },
      ])
      .select("*")
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // Skicka bekräftelse via nya helpern (objekt-signatur)
    await sendOfferMail({
      offerId: String(data.id ?? offerNumber),
      offerNumber: String(data.offer_number ?? offerNumber),
      customerEmail: String(customer_email),

      // valfria, för trevligare e-post
      customerName: customer_name ?? null,
      customerPhone: customer_phone ?? null,
      notes: notes ?? null,

      // primärsträcka okänd här → lämnas null (du kan fylla på om du har dem i req.body)
      from: null,
      to: null,
      date: null,
      time: null,
      passengers: null,
    });

    return res.status(200).json({ success: true, offer: data });
  } catch (e: any) {
    console.error("update-status error:", e);
    return res.status(500).json({ error: e?.message || "Serverfel" });
  }
}
