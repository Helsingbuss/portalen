// src/pages/api/offert/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { withCors } from "@/lib/cors";
import {
  sendOfferMail,
  sendCustomerReceipt,
} from "@/lib/sendOfferMail";

/** Hjälpfunktion: plocka första icke-tomma värdet från flera keys */
function pick(body: any, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = body?.[k];
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return undefined;
}

/** Generera nästa offertnummer HB25XXX */
async function getNextOfferNumber() {
  const year = new Date().getFullYear().toString().slice(-2); // t.ex. "25"
  const prefix = `HB${year}`;

  const { data, error } = await supabaseAdmin
    .from("offers")
    .select("offer_number")
    .like("offer_number", `${prefix}%`)
    .order("offer_number", { ascending: false })
    .limit(1);

  if (error) {
    console.error("getNextOfferNumber error:", error.message || error);
    const rand = Math.floor(Math.random() * 900) + 100;
    return `${prefix}${rand}`;
  }

  let next = 1;
  if (data && data.length && data[0]?.offer_number) {
    const last = String(data[0].offer_number);
    const m = last.match(/^HB\d{2}(\d+)$/);
    if (m) next = parseInt(m[1], 10) + 1;
  }

  const seq = String(next).padStart(3, "0");
  return `${prefix}${seq}`;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const rawBody: any =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};

    /** ===== HÄMTA FÄLT FRÅN FORMULÄR ===== */

    const customerEmail =
      pick(rawBody, "customer_email", "email", "kund_email") || "";
    if (!customerEmail) {
      return res
        .status(400)
        .json({ error: "customer_email / email saknas i payload." });
    }

    const contactPerson =
      pick(
        rawBody,
        "contact_person",
        "contact_name",
        "Namn_efternamn",
        "namn_efternamn"
      ) || null;

    const customerPhone =
      pick(rawBody, "customer_phone", "telefon", "phone") || null;

    const company =
      pick(
        rawBody,
        "foretag_forening",
        "företag_förening",
        "company",
        "företag_förening"
      ) || null;

    const orgNumber =
      pick(rawBody, "org_number", "orgnr", "org_nummer") || null;

    const fromPlace =
      pick(rawBody, "departure_place", "from", "avresa") || null;
    const toPlace =
      pick(rawBody, "destination", "to", "destinationen") || null;

    const via = pick(rawBody, "via") || null;
    const stop = pick(rawBody, "stop") || null;

    const departureDate =
      pick(rawBody, "departure_date", "date", "datum") || null;
    const departureTime =
      pick(rawBody, "departure_time", "time", "tid") || null;

    const enkelTurRetur =
      pick(rawBody, "enkel_tur_retur", "typ_av_resa") || null;

    const returnDeparture =
      pick(rawBody, "return_departure", "retur_fran") || null;
    const finalDestination =
      pick(rawBody, "final_destination", "slutdestination") || null;
    const returnDate = pick(rawBody, "return_date") || null;
    const returnTime = pick(rawBody, "return_time") || null;

    // --- FIX: behover_buss "Ja"/"Nej" -> boolean ---
    const behoverBussRaw = pick(rawBody, "behover_buss") || null;
    let behoverBuss: boolean | null = null;
    if (behoverBussRaw) {
      const v = behoverBussRaw.toString().trim().toLowerCase();
      if (["ja", "yes", "true", "1", "on"].includes(v)) {
        behoverBuss = true;
      } else if (["nej", "no", "false", "0", "off"].includes(v)) {
        behoverBuss = false;
      } else {
        behoverBuss = null; // oväntat värde, spara hellre null än att krascha
      }
    }
    // -----------------------------------------------

    const notisPaPlats = pick(rawBody, "notis_pa_plats") || null;
    const basplatsPaDestination =
      pick(rawBody, "basplats_pa_destination") || null;

    const endTime = pick(rawBody, "end_time") || null;
    const localKor = pick(rawBody, "local_kor") || null;
    const standby = pick(rawBody, "standby") || null;
    const parkering = pick(rawBody, "parkering") || null;

    const referensPo =
      pick(rawBody, "Referens_PO_nummer", "referens_po_nummer") || null;

    const passengersRaw =
      pick(rawBody, "passengers", "pax", "antal_resenarer") || undefined;
    const passengers =
      passengersRaw != null && !Number.isNaN(Number(passengersRaw))
        ? Number(passengersRaw)
        : null;

    const notes =
      pick(rawBody, "notes", "noteringar", "message", "meddelande") || null;

    /** ===== skapa offertnummer ===== */
    const offerNumber = await getNextOfferNumber();

    /** ===== INSERT: ENDAST KOLUMNER SOM FINNS I TABELLEN ===== */
    const insertPayload: any = {
      offer_number: offerNumber,

      // kund
      contact_person: contactPerson,
      Namn_efternamn: contactPerson,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      foretag_forening: company,
      org_number: orgNumber,
      Referens_PO_nummer: referensPo,

      // resa
      departure_place: fromPlace,
      destination: toPlace,
      via,
      stop,
      departure_date: departureDate,
      departure_time: departureTime,
      enkel_tur_retur: enkelTurRetur,
      return_departure: returnDeparture,
      final_destination: finalDestination,
      return_date: returnDate,
      return_time: returnTime,
      notis_pa_plats: notisPaPlats,
      basplats_pa_destination: basplatsPaDestination,
      end_time: endTime,
      local_kor: localKor,
      standby,
      parkering,
      passengers,
      notes,
    };

    // sätt bara behover_buss om vi har lyckats tolka det till boolean/null
    if (behoverBuss !== null) {
      insertPayload.behover_buss = behoverBuss;
    }

    const { data, error } = await supabaseAdmin
      .from("offers")
      .insert(insertPayload)
      .select(
        "id, offer_number, departure_place, destination, departure_date, departure_time, passengers"
      )
      .single();

    if (error) {
      console.error("/api/offert/create insert error:", error);
      return res.status(500).json({
        error: "Kunde inte skapa offert i databasen.",
        supabaseError: error.message || String(error),
      });
    }

    const created = data as any;
    const finalOfferNumber: string = created.offer_number || offerNumber;

    /** ===== mail till admin ===== */
    try {
      await sendOfferMail({
        offerId: String(created.id),
        offerNumber: finalOfferNumber,
        customerEmail,
        customerName: contactPerson || company || undefined,
        from: fromPlace || undefined,
        to: toPlace || undefined,
        date: departureDate || undefined,
        time: departureTime || undefined,
        passengers: passengers ?? undefined,
      });
    } catch (err) {
      console.error("sendOfferMail error:", (err as any)?.message || err);
    }

    /** ===== kvittens till kund ===== */
    try {
      await sendCustomerReceipt({
        to: customerEmail,
        offerNumber: finalOfferNumber,
        from: fromPlace || undefined,
        toPlace: toPlace || undefined,
        date: departureDate || undefined,
        time: departureTime || undefined,
        passengers: passengers ?? undefined,
      });
    } catch (err) {
      console.error(
        "sendCustomerReceipt error:",
        (err as any)?.message || err
      );
    }

    return res.status(200).json({
      ok: true,
      id: created.id,
      offerNumber: finalOfferNumber,
    });
  } catch (e: any) {
    console.error("/api/offert/create fatal error:", e?.message || e);
    return res.status(500).json({ error: "Internt fel i offert-API:t." });
  }
}

export default withCors(handler);
