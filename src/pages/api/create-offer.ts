// src/pages/api/create-offer.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabaseAdmin";
import { sendOfferMail } from "@/lib/sendOfferMail"; // använder objekt-signaturen


function todayISODate(): string {
  return new Date().toISOString().split("T")[0];
}

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
    } = req.body ?? {};

    if (!customer_name || !customer_email) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 1) Hämta senaste offertnumret
    const { data: lastOffer } = await supabase
      .from("offers")
      .select("offer_number")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    let nextNumber = 7; // Startar på 7 (HB25007)
    if (lastOffer && lastOffer.offer_number) {
      const lastNum = parseInt(String(lastOffer.offer_number).replace("HB25", ""), 10);
      if (!Number.isNaN(lastNum)) nextNumber = lastNum + 1;
    }

    const offer_number = `HB25${String(nextNumber).padStart(3, "0")}`;

    // 2) Spara offert i databasen
    const { data, error } = await supabase
      .from("offers")
      .insert([
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
          offer_date: todayISODate(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // 3) Skicka bekräftelsemejl (ny objekt-signatur)
    // - offerId: använd DB-id om det finns, annars fall tillbaka till offer_number
    const offerId = (data as any)?.id ?? offer_number;

    await sendOfferMail({
      offerId,
      offerNumber: offer_number,
      customerEmail: customer_email,

      // valfria men trevliga uppgifter i mailet
      customerName: customer_name ?? null,
      customerPhone: customer_phone ?? null,

      // Primär sträcka
      from: departure_place ?? null,
      to: destination ?? null,
      date: departure_date ?? null,
      time: departure_time ?? null,
      passengers: typeof passengers === "number" ? passengers : null,

      // Övrigt
      notes: notes ?? null,
    });

    return res.status(200).json({
      success: true,
      message: "Offer created successfully",
      offer: data,
    });
  } catch (error: any) {
    console.error("Error creating offer:", error);
    return res.status(500).json({ error: error?.message || "Server error" });
  }
}
