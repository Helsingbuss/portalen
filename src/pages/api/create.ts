// src/pages/api/offert/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabaseClient";
import { sendOfferMail } from "@/lib/sendMail";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { customer_name, customer_email, customer_phone, notes } = req.body;

  const offerNumber = `HB${Date.now().toString().slice(-5)}`;

  const { data, error } = await supabase
    .from("offers")
    .insert([
      {
        offer_number: offerNumber,
        customer_reference: customer_name,
        contact_phone: customer_phone,
        notes,
        status: "inkommen",
      },
    ])
    .select("*")
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await sendOfferMail(customer_email, offerNumber, "inkommen");

  return res.status(200).json({ success: true, offer: data });
}
