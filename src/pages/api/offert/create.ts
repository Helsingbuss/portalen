// src/pages/api/offert/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabaseClient";
import { sendOfferMail } from "@/lib/sendMail";

// Hjälpfunktion för att normalisera datumformatet
function normalizeDate(dateString: string | undefined) {
  if (!dateString) return null;
  const parts = dateString.split(".");
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month}-${day}`; // YYYY-MM-DD
  }
  return dateString; // returnera som den är om redan ISO-format
}

// Hjälpfunktion för options → text[]
function normalizeOptions(input: any): string[] {
  if (!input) return [];
  if (Array.isArray(input)) return input.filter(Boolean);
  if (typeof input === "string" && input.trim() !== "") return [input.trim()];
  return [];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log("📩 Incoming request body:", req.body);

  try {
    let {
      customer_name,
      first_name,
      last_name,
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

    // ✅ Slå ihop förnamn/efternamn om customer_name saknas
    if (!customer_name && (first_name || last_name)) {
      customer_name = `${first_name || ""} ${last_name || ""}`.trim();
    }

    // ✅ Validera att viktiga fält finns
    if (!customer_email || !customer_phone) {
      console.error("❌ Missing required fields:", { customer_email, customer_phone });
      return res.status(400).json({ error: "E-post och telefonnummer är obligatoriska" });
    }

    // ✅ Normalisera datum
    const normDepartureDate = normalizeDate(departure_date);
    const normReturnDate = normalizeDate(return_date);
    const normEndDate = normalizeDate(end_date);

    // ✅ Hantera passengers → alltid number
    const normPassengers = passengers ? Number(passengers) : null;

    // ✅ Hantera options → alltid array
    const normOptions = normalizeOptions(options);

    console.log("🔍 Parsed data:", {
      customer_name,
      customer_email,
      customer_phone,
      passengers: normPassengers,
      departure_place,
      destination,
      departure_date: normDepartureDate,
      departure_time,
      options: normOptions,
      return_departure,
      return_destination,
      return_date: normReturnDate,
      return_time,
      stopover_places,
      plans_description,
      final_destination,
      end_date: normEndDate,
      end_time,
      customer_type,
      company,
      association,
      org_number,
      invoice_ref,
      contact_person,
      notes,
    });

    // Skapa offertnummer
    const offerNumber = `HB${Date.now().toString().slice(-5)}`;
    console.log("📝 Genererat offertnummer:", offerNumber);

    // ✅ Lägg in i Supabase
    const { data, error } = await supabase
      .from("offers")
      .insert([
        {
          offer_number: offerNumber,
          customer_reference: customer_name,
          contact_email: customer_email,
          contact_phone: customer_phone,
          passengers: normPassengers,
          departure_place,
          destination,
          departure_date: normDepartureDate,
          departure_time,
          options: normOptions, // <---- alltid array
          return_departure,
          return_destination,
          return_date: normReturnDate,
          return_time,
          stopover_places,
          plans_description,
          final_destination,
          end_date: normEndDate,
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
      console.error("❌ Supabase insert error:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log("✅ Supabase insert success:", data);

    // Skicka bekräftelsemail till kund
    await sendOfferMail(customer_email, offerNumber, "inkommen");

    // Skicka adminnotis till offert@helsingbuss.se
    await sendOfferMail("offert@helsingbuss.se", offerNumber, "inkommen");

    // ✅ Returnera JSON
    return res.status(200).json({
      success: true,
      offerId: offerNumber,
      offer: data,
    });
  } catch (err: any) {
    console.error("🔥 API error:", err);
    return res.status(500).json({ error: err.message || "Något gick fel" });
  }
}
