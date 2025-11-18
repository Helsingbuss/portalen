// src/pages/api/offers/send-proposal.ts
import type { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabaseAdmin";
import { sendOfferMail } from "@/lib/sendMail";



// ===== Typ som matchar dina kolumner =====
type OfferRow = {
  id: string;
  offer_number: string;
  status?: string | null;

  contact_person: string | null;
  customer_email: string | null;
  customer_phone: string | null;

  departure_place: string | null;
  destination: string | null;
  departure_date: string | null;
  departure_time: string | null;

  via: string | null;
  stop: string | null;
  passengers?: number | null;

  return_departure: string | null;
  return_destination: string | null;
  return_date: string | null;
  return_time: string | null;

  notes?: string | null;
};

// Typvakt så TS vet att vi har rätt struktur
function isOfferRow(d: any): d is OfferRow {
  return d && typeof d === "object" && typeof d.id === "string" && typeof d.offer_number === "string";
}

// Hjälpare: null/undefined → undefined (för mailparametrar)
const U = <T extends string | number | null | undefined>(v: T) =>
  (v == null ? undefined : (v as Exclude<T, null>));

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    // Body kan t.ex. komma från adminformulär
    const input = (req.body || {}) as {
      offer_id?: string;
      // fält som kan komma från formuläret (valfria):
      via?: string | null;
      stop?: string | null;
      notes?: string | null;
      onboard_contact?: string | null; // vi lägger in i notes
      return_departure?: string | null;
      return_destination?: string | null;
      return_date?: string | null;
      return_time?: string | null;
    };

    const id = String(input.offer_id || req.query.id || "");
    if (!id) return res.status(400).json({ error: "Saknar offert-id" });

    // Hämta offerten
    const { data, error } = await supabase
      .from("offers")
      .select([
        "id",
        "offer_number",
        "status",
        "contact_person",
        "customer_email",
        "customer_phone",
        "departure_place",
        "destination",
        "departure_date",
        "departure_time",
        "via",
        "stop",
        "passengers",
        "return_departure",
        "return_destination",
        "return_date",
        "return_time",
        "notes",
      ].join(","))
      .eq("id", id)
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!isOfferRow(data)) return res.status(500).json({ error: "Dataparsning misslyckades (OfferRow)" });

    const offer = data;

    // Sätt status "besvarad" om inte redan
    const current = String(offer.status ?? "").toLowerCase();
    if (current !== "besvarad") {
      const { error: uerr } = await supabase
        .from("offers")
        .update({ status: "besvarad" })
        .eq("id", id);
      if (uerr) return res.status(500).json({ error: uerr.message });
      offer.status = "besvarad";
    }

    // Bygg notes där vi klistrar in "Kontakt ombord" + ev. telefonnummer
    let outNotes = input.notes ?? offer.notes ?? null;
    const extras: string[] = [];
    if (input.onboard_contact && String(input.onboard_contact).trim() !== "") {
      extras.push(`Kontakt ombord: ${input.onboard_contact}`);
    }
    if (offer.customer_phone && String(offer.customer_phone).trim() !== "") {
      extras.push(`Telefon: ${offer.customer_phone}`);
    }
    if (extras.length) {
      outNotes = [outNotes?.toString().trim() || "", ...extras].filter(Boolean).join("\n");
    }

    // Tillåt att via/stop/retur-fält kan matas in i POST:en för att maila korrekt info
    const viaOut  = input.via  ?? offer.via  ?? null;
    const stopOut = input.stop ?? offer.stop ?? null;

    const retFrom = input.return_departure   ?? offer.return_departure   ?? null;
    const retTo   = input.return_destination ?? offer.return_destination ?? null;
    const retDate = input.return_date        ?? offer.return_date        ?? null;
    const retTime = input.return_time        ?? offer.return_time        ?? null;

    // Skicka “besvarad”-mail
    await sendOfferMail({
      offerId: String(offer.id),
      offerNumber: String(offer.offer_number),

      customerEmail: U(offer.customer_email),
      customerName: U(offer.contact_person),

      from: U(offer.departure_place),
      to: U(offer.destination),
      date: U(offer.departure_date),
      time: U(offer.departure_time),
      via: U(viaOut),
      stop: U(stopOut),
      passengers: typeof offer.passengers === "number" ? offer.passengers : undefined,

      return_from: U(retFrom),
      return_to: U(retTo),
      return_date: U(retDate),
      return_time: U(retTime),

      notes: U(outNotes),
    });

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error("[offers/send-proposal] error:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Serverfel" });
  }
}
