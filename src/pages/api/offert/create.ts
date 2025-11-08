// src/pages/api/offert/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";
import { sendOfferMail } from "@/lib/sendOfferMail"; // ← NY modul/signatur

// Få en supabase-klient oavsett hur exporten ser ut i supabaseAdmin
const supabase =
  (admin as any).supabaseAdmin || (admin as any).supabase || (admin as any).default;

function toNull<T = any>(v: T | null | undefined): T | null {
  return v === "" || v === undefined ? null : (v as any);
}
function pickYmd(v?: string | null) {
  if (!v) return null;
  // accepterar "YYYY-MM-DD" eller en ISO-sträng
  return v.length >= 10 ? v.slice(0, 10) : v;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const p = req.body ?? {};

    // ---- Läs in fält från formuläret ----
    const customer_name: string | null = toNull(p.customer_name);
    const customer_email: string | null = toNull(p.customer_email);
    const customer_phone: string | null = toNull(p.customer_phone);

    // Kommer från UI-fältet ”Kontaktperson ombord (namn och nummer)” i steg 1 om du skickar det
    const raw_onboard_contact: string | null = toNull(p.onboard_contact);

    // Rätt DB-kolumn: customer_reference (använd om given, annars fall tillbaka till onboard_contact, annars kontaktperson)
    const customer_reference: string | null =
      toNull(p.customer_reference) ?? raw_onboard_contact ?? customer_name;

    const internal_reference: string | null = toNull(p.internal_reference);

    const passengers: number | null =
      typeof p.passengers === "number"
        ? p.passengers
        : Number.isFinite(Number(p.passengers))
        ? Number(p.passengers)
        : null;

    const departure_place: string | null = toNull(p.departure_place);
    const destination: string | null = toNull(p.destination);
    const departure_date: string | null = pickYmd(toNull(p.departure_date));
    const departure_time: string | null = toNull(p.departure_time);

    const return_departure: string | null = toNull(p.return_departure);
    const return_destination: string | null = toNull(p.return_destination);
    const return_date: string | null = pickYmd(toNull(p.return_date));
    const return_time: string | null = toNull(p.return_time);

    // 🚫 Ingen 'via' i DB – rätt kolumn är 'stopover_places'
    const stopover_places: string | null = toNull(p.stopover_places ?? p.via);

    // 🚫 'round_trip' finns inte i din DB – skicka inte den i insert
    const notes: string | null = toNull(p.notes);

    if (!customer_name || !customer_email) {
      return res.status(400).json({ error: "customer_name och customer_email krävs" });
    }

    // ---- Offertnummer (HB25xxx) – samma logik som tidigare ----
    const { data: lastOffer } = await supabase
      .from("offers")
      .select("offer_number")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    let nextNumber = 7; // Startvärde (HB25007)
    if (lastOffer?.offer_number) {
      const lastNum = parseInt(String(lastOffer.offer_number).replace("HB25", ""), 10);
      if (Number.isFinite(lastNum)) nextNumber = lastNum + 1;
    }
    const offer_number = `HB25${String(nextNumber).padStart(3, "0")}`;

    // ---- Spara i DB ----
    const insertPayload: any = {
      offer_number,
      status: "inkommen",
      offer_date: new Date().toISOString().slice(0, 10),

      // kontakt
      contact_person: customer_name,
      contact_phone: customer_phone,
      contact_email: customer_email, // gör att quote/accept hittar e-post

      // referenser
      customer_reference,           // ✅ rätt kolumn
      internal_reference,

      // resa
      passengers,
      departure_place,
      destination,
      departure_date,
      departure_time,
      stopover_places,              // ✅ rätt kolumnnamn

      // retur
      return_departure,
      return_destination,
      return_date,
      return_time,

      // övrigt
      notes,

      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: row, error: insErr } = await supabase
      .from("offers")
      .insert([insertPayload])
      .select("*")
      .single();

    if (insErr) throw insErr;

    // ---- Skicka mejl (tyst felhantering) ----
    try {
      await sendOfferMail({
        offerId: String(row.id ?? offer_number),
        offerNumber: String(offer_number),
        customerEmail: customer_email,

        customerName: customer_name,
        customerPhone: customer_phone,

        from: departure_place,
        to: destination,
        date: departure_date,
        time: departure_time,
        passengers,
        via: stopover_places,               // för mail-templaten
        onboardContact: raw_onboard_contact, // visas i mail, men SPARAS INTE i DB

        return_from: return_departure,
        return_to: return_destination,
        return_date,
        return_time,

        notes,
      });
    } catch (mailErr) {
      console.warn("sendOfferMail (create offert) failed:", (mailErr as any)?.message || mailErr);
    }

    return res.status(200).json({ success: true, offer: row });
  } catch (e: any) {
    console.error("/api/offert/create error:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Serverfel" });
  }
}
