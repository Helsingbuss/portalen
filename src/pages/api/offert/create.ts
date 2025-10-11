// src/pages/api/offert/create.ts
import type {
  NextApiRequest as NextApiRequestT,
  NextApiResponse as NextApiResponseT,
} from "next";
import { supabase } from "@/lib/supabaseClient";
import { sendOfferMail } from "@/lib/sendMail";

/** Normalisera "DD.MM.YYYY" → "YYYY-MM-DD" */
function normalizeDate(dateString: string | undefined) {
  if (!dateString) return null;
  const parts = dateString.split(".");
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month}-${day}`;
  }
  return dateString;
}

/** Säkra options till string[] */
function normalizeOptions(input: any): string[] {
  if (!input) return [];
  if (Array.isArray(input)) return input.filter(Boolean);
  if (typeof input === "string" && input.trim() !== "") return [input.trim()];
  return [];
}

/** HB + YY + NNN (ex. HB25007) */
function formatOfferNumber(yearYY: string, serial: number) {
  const pad = String(serial).padStart(3, "0");
  return `HB${yearYY}${pad}`;
}

export default async function handler(req: NextApiRequestT, res: NextApiResponseT) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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

    // Slå ihop namn om endast för/efternamn skickats
    if (!customer_name && (first_name || last_name)) {
      customer_name = `${first_name || ""} ${last_name || ""}`.trim();
    }

    // Grundvalidering
    if (!customer_email || !customer_phone) {
      return res.status(400).json({ error: "E-post och telefonnummer är obligatoriska" });
    }

    // Normalisering
    const normDepartureDate = normalizeDate(departure_date);
    const normReturnDate = normalizeDate(return_date);
    const normEndDate = normalizeDate(end_date);
    const normPassengers = passengers ? Number(passengers) : null;
    const normOptions = normalizeOptions(options);

    // --- Generera offertnummer i DB (atomiskt) ---
    const yy = new Date().getFullYear().toString().slice(-2); // "25"
    const { data: seqData, error: seqErr } = await supabase
      .rpc("next_offer_serial", { year_in: Number(yy) });

    if (seqErr) {
      console.error("next_offer_serial error:", seqErr);
      return res.status(500).json({
        error:
          "Kunde inte generera offertnummer (saknas DB-funktion next_offer_serial).",
      });
    }

    const offerNumber = formatOfferNumber(yy, Number(seqData)); // HB25NNN

    // --- Spara i offers ---
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
          status: "inkommen",
        },
      ])
      .select("*")
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(500).json({ error: error.message });
    }

    // Mail – exakt som tidigare
    await sendOfferMail(customer_email, offerNumber, "inkommen");
    await sendOfferMail("offert@helsingbuss.se", offerNumber, "inkommen");

    return res.status(200).json({
      success: true,
      offerId: offerNumber,
      offer: data,
    });
  } catch (err: any) {
    console.error("API error:", err);
    return res.status(500).json({ error: err.message || "Något gick fel" });
  }
}
