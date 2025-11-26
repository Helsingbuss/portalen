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
  return (
    d &&
    typeof d === "object" &&
    typeof d.id === "string" &&
    typeof d.offer_number === "string"
  );
}

// Hjälpare: null/undefined → undefined (för mailparametrar)
const U = <T extends string | number | null | undefined>(v: T) =>
  v == null ? undefined : (v as Exclude<T, null>);

// Kolla om strängen ser ut som en UUID
function looksLikeUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    v
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== "POST")
      return res.status(405).json({ error: "Method not allowed" });

    // Body kommer från OfferCalculator.sendProposal
    const body = (req.body || {}) as {
      offerId?: string; // kan vara UUID eller HB-nummer
      offerNumber?: string;
      totals?: {
        exVat: number;
        vat: number;
        total: number;
      };
      pricing?: any;
      input?: {
        via?: string | null;
        stop?: string | null;
        note?: string | null;
        leg1?: { domain?: string };
        leg2?: { domain?: string } | null;
      };
      // extra fält om du vill mata in retur osv senare
      via?: string | null;
      stop?: string | null;
      notes?: string | null;
      onboard_contact?: string | null;
      return_departure?: string | null;
      return_destination?: string | null;
      return_date?: string | null;
      return_time?: string | null;
    };

    // Vi accepterar både UUID och offertnummer
    const idOrNoRaw =
      (body.offerId || body.offerNumber || (req.query.id as string) || "")
        .toString()
        .trim();

    if (!idOrNoRaw)
      return res.status(400).json({ error: "Saknar offert-id/nummer" });

    const useUuid = looksLikeUuid(idOrNoRaw);

    // Hämta offerten – välj rätt kolumn beroende på om det är UUID eller HB-nummer
    let query = supabase
      .from("offers")
      .select(
        [
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
        ].join(",")
      )
      .limit(1);

    if (useUuid) {
      query = query.eq("id", idOrNoRaw);
    } else {
      query = query.eq("offer_number", idOrNoRaw);
    }

    const { data, error } = await query.single();

    if (error) return res.status(500).json({ error: error.message });
    if (!isOfferRow(data))
      return res
        .status(500)
        .json({ error: "Dataparsning misslyckades (OfferRow)" });

    const offer = data;

    // Sätt status "besvarad" om inte redan
    const current = String(offer.status ?? "").toLowerCase();
    if (current !== "besvarad") {
      const { error: uerr } = await supabase
        .from("offers")
        .update({ status: "besvarad" })
        .eq("id", offer.id);
      if (uerr) return res.status(500).json({ error: uerr.message });
      offer.status = "besvarad";
    }

    // Bygg notes där vi klistrar in "Kontakt ombord" + ev. telefonnummer
    let outNotes = body.notes ?? offer.notes ?? null;
    const extras: string[] = [];
    if (body.onboard_contact && String(body.onboard_contact).trim() !== "") {
      extras.push(`Kontakt ombord: ${body.onboard_contact}`);
    }
    if (offer.customer_phone && String(offer.customer_phone).trim() !== "") {
      extras.push(`Telefon: ${offer.customer_phone}`);
    }
    if (extras.length) {
      outNotes = [outNotes?.toString().trim() || "", ...extras]
        .filter(Boolean)
        .join("\n");
    }

    // via/stop/retur för mailet – ta från body om de finns, annars från offerten
    const viaOut = body.via ?? body.input?.via ?? offer.via ?? null;
    const stopOut = body.stop ?? body.input?.stop ?? offer.stop ?? null;

    const retFrom =
      body.return_departure ?? offer.return_departure ?? null;
    const retTo =
      body.return_destination ?? offer.return_destination ?? null;
    const retDate = body.return_date ?? offer.return_date ?? null;
    const retTime = body.return_time ?? offer.return_time ?? null;

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
      passengers:
        typeof offer.passengers === "number" ? offer.passengers : undefined,

      return_from: U(retFrom),
      return_to: U(retTo),
      return_date: U(retDate),
      return_time: U(retTime),

      notes: U(outNotes),
      // du kan även skicka med totals/pricing/body.input om din mall använder det
    });

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error("[offers/send-proposal] error:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Serverfel" });
  }
}
