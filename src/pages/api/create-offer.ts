// src/pages/api/create-offer.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabaseAdmin";
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
      customer_reference,
      internal_reference,
      passengers,
      departure_place,
      destination,
      departure_date,
      departure_time,
      round_trip,
      notes,
    } = req.body;

    if (!customer_name || !customer_email) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 1. HÃ¤mta senaste offertnummer
    const { data: lastOffer } = await supabase
      .from("offers")
      .select("offer_number")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    let nextNumber = 7; // Startar pÃ¥ 7 (HB25007)
    if (lastOffer && lastOffer.offer_number) {
      const lastNum = parseInt(lastOffer.offer_number.replace("HB25", ""), 10);
      nextNumber = lastNum + 1;
    }
    const offer_number = `HB25${nextNumber.toString().padStart(3, "0")}`;

    // 2. Spara offert i databasen
    const { data, error } = await supabase.from("offers").insert([
      {
        offer_number,
        customer_reference,
        internal_reference,
        passengers,
        departure_place,
        destination,
        departure_date,
        departure_time,
        round_trip,
        notes,
        contact_person: customer_name,
        contact_phone: customer_phone,
        status: "inkommen",
        offer_date: new Date().toISOString().split("T")[0],
      },
    ]).select().single();

    if (error) throw error;

    // 3. Skicka bekrÃ¤ftelsemail
    await sendOfferMail(customer_email, offer_number, "inkommen");

    return res.status(200).json({
      success: true,
      message: "Offer created successfully",
      offer: data,
    });
  } catch (error: any) {
    console.error("Error creating offer:", error);
    return res.status(500).json({ error: error.message });
  }
}


