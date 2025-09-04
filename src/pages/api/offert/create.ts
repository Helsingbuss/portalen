// src/pages/api/offert/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabaseClient";
import { sendOfferMail } from "@/lib/sendMail";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      customer_name,
      customer_email,
      customer_phone,
      passengers,
      departure_place,
      destination,
      departure_date,
      departure_time,
      options,
      return_departure,
      return_destination,
      return_date,
      return_time,
      stopover_places,
      plans_description,
      final_destination,
      end_date,
      end_time,
      customer_type,
      company,
      association,
      org_number,
      invoice_ref,
      contact_person,
      notes,
    } = req.body;

    // Skapa offertnummer
    const offerNumber = `HB${Date.now().toString().slice(-5)}`;

    // Lägg in i Supabase
    const { data, error } = await supabase
      .from("offers")
      .insert([
        {
          offer_number: offerNumber,
          customer_reference: customer_name,
          contact_email: customer_email,
          contact_phone: customer_phone,
          passengers,
          departure_place,
          destination,
          departure_date,
          departure_time,
          options,
          return_departure,
          return_destination,
          return_date,
          return_time,
          stopover_places,
          plans_description,
          final_destination,
          end_date,
          end_time,
          customer_type,
          company,
          association,
          org_number,
          invoice_ref,
          contact_person,
          notes,
          status: "inkommen",
        },
      ])
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Skicka bekräftelsemail till kund
    await sendOfferMail(customer_email, offerNumber, "inkommen");

    // Skicka adminnotis till offert@helsingbuss.se
    await sendOfferMail("offert@helsingbuss.se", offerNumber, "inkommen");

    // Returnera JSON
    return res.status(200).json({
      success: true,
      offerId: offerNumber,
      offer: data,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Något gick fel" });
  }
}
