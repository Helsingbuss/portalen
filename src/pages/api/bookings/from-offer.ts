// src/pages/api/bookings/from-offer.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";




// Fungerar bÃ¥de dÃ¤r du exporterar som supabaseAdmin eller default
const supabase =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

type JsonError = { error: string };

// ---------- helpers ----------
function isUUID(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s || "");
}
function trimOrNull(v: any): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}
function stripSpacesDashes(v: any): string {
  return String(v ?? "").replace(/[\s-]+/g, "");
}
function toPosIntOrNull(v: any): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.floor(n));
}
// "8" | "8:0" | "0800" | "08:00" => "08:00"
function tidyHHMM(v: any): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (s.includes(":")) {
    const [hh, mm = "00"] = s.split(":");
    const HH = String(hh || "00").padStart(2, "0").slice(0, 2);
    const MM = String(mm || "00").padStart(2, "0").slice(0, 2);
    return `${HH}:${MM}`;
  }
  if (/^\d{1,4}$/.test(s)) {
    const pad = s.padStart(4, "0");
    return `${pad.slice(0, 2)}:${pad.slice(2, 4)}`;
  }
  return null;
}
// Robust random BK-nummer: BK{YY}{4-digit}
function generateBookingNo(): string {
  const yy = new Date().getFullYear().toString().slice(-2);
  const rnd = Math.floor(1000 + Math.random() * 9000);
  return `BK${yy}${rnd}`;
}

// ---------- handler ----------
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any | JsonError>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      // identifierare
      offerId,
      offerNumber,

      // ev. tilldelningar frÃ¥n admin
      assigned_vehicle_id,
      assigned_driver_id,

      // mÃ¶jlighet att overrideâ€™a noteringar
      notes,
    } = (req.body ?? {}) as Record<string, any>;

    if (!offerId && !offerNumber) {
      return res.status(400).json({ error: "Du mÃ¥ste ange offerId eller offerNumber" });
    }

    // ----- 1) HÃ„MTA OFFERT -----
    // Matchar nya fÃ¤ltnamn (jfr /api/offers/options)
    const selectCols = [
      "id",
      "offer_number",
      "status",
      "offer_date",

      // kontakt/kund
      "contact_person",
      "contact_email",
      "customer_email",
      "contact_phone",
      "customer_phone",

      "passengers",
      "notes",

      // utresa
      "departure_place",
      "destination",
      "departure_date",
      "departure_time",
      "end_time",
      "on_site_minutes",
      "stopover_places",

      // retur
      "return_departure",
      "return_destination",
      "return_date",
      "return_time",
      "return_end_time",
      "return_on_site_minutes",
    ].join(",");

    let off: any = null;
    if (offerId) {
      const { data, error } = await supabase
        .from("offers")
        .select(selectCols)
        .eq(isUUID(String(offerId)) ? "id" : "offer_number", offerId)
        .single();
      if (error) throw error;
      off = data;
    } else {
      const { data, error } = await supabase
        .from("offers")
        .select(selectCols)
        .eq("offer_number", offerNumber)
        .single();
      if (error) throw error;
      off = data;
    }

    if (!off) {
      return res.status(404).json({ error: "Offert hittades inte" });
    }

    // ----- 2) BYGG BOOKING-PAYLOAD -----
    // Mappar direkt till bookings-tabellens nya fÃ¤lt
    const customer_phone_raw =
      off.contact_phone ?? off.customer_phone ?? null;
    const customer_phone = customer_phone_raw ? stripSpacesDashes(customer_phone_raw) : null;

    const payloadBase = {
      // status â€“ sÃ¤tt "bokad" fÃ¶r att matcha admin-listans fÃ¤rgkodning
      status: "bokad",

      // Kund
      contact_person: trimOrNull(off.contact_person) ?? null,
      customer_email: trimOrNull(off.contact_email ?? off.customer_email) ?? null,
      customer_phone,

      // Utresa
      passengers: toPosIntOrNull(off.passengers) ?? 0,
      departure_place: trimOrNull(off.departure_place),
      destination: trimOrNull(off.destination),
      departure_date: trimOrNull(off.departure_date),
      departure_time: tidyHHMM(off.departure_time),
      end_time: tidyHHMM(off.end_time),
      on_site_minutes:
        off.on_site_minutes === null || off.on_site_minutes === undefined
          ? null
          : toPosIntOrNull(off.on_site_minutes),
      stopover_places: trimOrNull(off.stopover_places),

      // Retur
      return_departure: trimOrNull(off.return_departure),
      return_destination: trimOrNull(off.return_destination),
      return_date: trimOrNull(off.return_date),
      return_time: tidyHHMM(off.return_time),
      return_end_time: tidyHHMM(off.return_end_time),
      return_on_site_minutes:
        off.return_on_site_minutes === null || off.return_on_site_minutes === undefined
          ? null
          : toPosIntOrNull(off.return_on_site_minutes),

      // Tilldelningar (valfria)
      assigned_vehicle_id: trimOrNull(assigned_vehicle_id),
      assigned_driver_id: trimOrNull(assigned_driver_id),

      // Ã–vrigt (override om notes skickas med)
      notes: trimOrNull(notes ?? off.notes),

      // Knyt tillbaka till offerten (om kolumner finns i DB)
      offer_id: off.id ?? null,
      offer_number: off.offer_number ?? null,

      // tidsstÃ¤mplar (om DB inte sÃ¤tter default)
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Record<string, any>;

    // ----- 3) SKAPA BOKNING med robust booking_number -----
    const MAX_TRIES = 5;
    let attempt = 0;
    let created: any = null;
    let lastErr: any = null;

    while (attempt < MAX_TRIES && !created) {
      attempt += 1;
      const bk = generateBookingNo();

      const { data, error } = await supabase
        .from("bookings")
        .insert({ ...payloadBase, booking_number: bk })
        .select(
          [
            "id",
            "booking_number",
            "contact_person",
            "customer_email",
            "customer_phone",
            "passengers",
            "departure_place",
            "destination",
            "departure_date",
            "departure_time",
            "end_time",
            "on_site_minutes",
            "stopover_places",
            "return_departure",
            "return_destination",
            "return_date",
            "return_time",
            "return_end_time",
            "return_on_site_minutes",
            "assigned_vehicle_id",
            "assigned_driver_id",
            "notes",
            "offer_id",
            "offer_number",
            "status",
            "created_at",
          ].join(",")
        )
        .single();

      if (!error && data) {
        created = data;
        break;
      }

      const msg = String(error?.message || "");
      if (error?.code === "23505" || /duplicate key|unique constraint/i.test(msg)) {
        // kolliderade pÃ¥ uniknyckel -> fÃ¶rsÃ¶k igen med nytt nr
        lastErr = error;
        continue;
      }
      if (error) {
        lastErr = error;
        break;
      }
    }

    if (!created) {
      throw lastErr || new Error("Kunde inte skapa bokning (okÃ¤nt fel).");
    }

    // (valfritt) uppdatera offertstatus -> "godkand"
    try {
      await supabase
        .from("offers")
        .update({ status: "godkand" })
        .eq("id", off.id);
    } catch {
      // tyst
    }

    return res.status(201).json({ ok: true, booking: created });
  } catch (e: any) {
    console.error("from-offer error:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Serverfel" });
  }
}

