// src/pages/api/offert/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { withCors } from "@/lib/cors";
import { sendOfferMail, sendCustomerReceipt } from "@/lib/sendMail";
import { signOfferToken } from "@/lib/offerToken";

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

/** Hjälpfunktion: "Ja"/"Nej" => boolean | null */
function parseBool(v: any): boolean | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim().toLowerCase();
  if (["ja", "yes", "true", "1"].includes(s)) return true;
  if (["nej", "no", "false", "0"].includes(s)) return false;
  return null;
}

/** Hjälpfunktion: hitta första e-postadress (med "@") någonstans i payloaden */
function findEmailInBody(body: any): string | undefined {
  const visited = new Set<any>();

  function search(value: any): string | undefined {
    if (value === null || value === undefined) return;

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.includes("@")) {
        return trimmed;
      }
      return;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return;
    }

    if (typeof value === "object") {
      if (visited.has(value)) return;
      visited.add(value);

      if (Array.isArray(value)) {
        for (const item of value) {
          const found = search(item);
          if (found) return found;
        }
      } else {
        for (const v of Object.values(value)) {
          const found = search(v);
          if (found) return found;
        }
      }
    }

    return;
  }

  return search(body);
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

    // 1) Försök med våra vanliga fältnamn
    const emailField =
      pick(rawBody, "customer_email", "email", "kund_email") || "";

    let customerEmail = emailField;

    // 2) Om det inte ser ut som en riktig e-postadress (t.ex. "E-post"),
    //    försök hitta första strängen med "@" någonstans i hela payloaden.
    if (!customerEmail || !customerEmail.includes("@")) {
      const fallback = findEmailInBody(rawBody);
      if (fallback && fallback.includes("@")) {
        console.log(
          "[offert/create] Fallback hittade kundens e-post i payload:",
          fallback
        );
        customerEmail = fallback;
      } else {
        console.warn(
          "[offert/create] Ingen giltig kund-e-post hittades – skickar bara adminmail.",
          { emailField, rawBody }
        );
        customerEmail = "";
      }
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

    const behoverBussRaw = pick(rawBody, "behover_buss");
    const behoverBuss = parseBool(behoverBussRaw);

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
      customer_email: customerEmail || null,
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
      behover_buss: behoverBuss,
      notis_pa_plats: notisPaPlats,
      basplats_pa_destination: basplatsPaDestination,
      end_time: endTime,
      local_kor: localKor,
      standby,
      parkering,
      passengers,
      notes,
    };

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
    const offerId = String(created.id);

    /** ===== Bygg kundlänk med token ===== */
    const token = signOfferToken({
      id: offerId,
      offerNumber: finalOfferNumber,
    });

    const baseCustomerUrl =
      process.env.NEXT_PUBLIC_CUSTOMER_BASE_URL ||
      process.env.CUSTOMER_BASE_URL ||
      "https://kund.helsingbuss.se";

    const cleanBase = baseCustomerUrl.replace(/\/+$/, "");
    const customerLink = `${cleanBase}/offert/${encodeURIComponent(
      offerId
    )}?token=${encodeURIComponent(token)}`;

    /** ===== mail till admin ===== */
    try {
      await sendOfferMail({
        offerId,
        offerNumber: finalOfferNumber,
        customerEmail: customerEmail || undefined,
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
      if (customerEmail && customerEmail.includes("@")) {
        console.log(
          "[offert/create] Skickar kundkvittens till:",
          customerEmail
        );
        await sendCustomerReceipt({
          to: customerEmail,
          offerNumber: finalOfferNumber,
          from: fromPlace || undefined,
          toPlace: toPlace || undefined,
          date: departureDate || undefined,
          time: departureTime || undefined,
          passengers: passengers ?? undefined,
          link: customerLink,
        });
      } else {
        console.warn(
          "[offert/create] Hoppar över kundkvittens – ingen giltig e-post."
        );
      }
    } catch (err) {
      console.error(
        "sendCustomerReceipt error:",
        (err as any)?.message || err
      );
    }

    return res.status(200).json({
      ok: true,
      id: offerId,
      offerNumber: finalOfferNumber,
    });
  } catch (e: any) {
    console.error("/api/offert/create fatal error:", e?.message || e);
    return res.status(500).json({ error: "Internt fel i offert-API:t." });
  }
}

export default withCors(handler);
