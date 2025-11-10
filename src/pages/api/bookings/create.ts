// src/pages/api/bookings/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendBookingMail } from "@/lib/sendBookingMail";

/** ---------- helpers ---------- */

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
  const i = Math.max(0, Math.floor(n));
  return i;
}

// Tål "8", "8:0", "08:0", "0800", "08:00" -> "08:00"
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

function isISODateLike(v: any): boolean {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}
function isEmailLike(v: any): boolean {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}
function isPhoneLike(v: any): boolean {
  const s = stripSpacesDashes(v);
  return typeof s === "string" && /^(?:\+?[1-9]\d{6,14}|0\d{6,14})$/.test(s);
}

function httpErr(res: NextApiResponse, code: number, msg: string) {
  return res.status(code).json({ error: msg });
}

// Robust random BK-nummer: BK{YY}{4-digit}
function generateBookingNo(): string {
  const yy = new Date().getFullYear().toString().slice(-2);
  const rnd = Math.floor(1000 + Math.random() * 9000);
  return `BK${yy}${rnd}`;
}

type InsertedBooking = {
  id: string;
  booking_number: string;
  customer_email?: string | null;
  passengers?: number | null;
  departure_place?: string | null;
  destination?: string | null;
  departure_date?: string | null;
  departure_time?: string | null;
};

// Type guard för att säkert identifiera InsertedBooking
function isInsertedBooking(x: any): x is InsertedBooking {
  return (
    x &&
    typeof x === "object" &&
    typeof x.id === "string" &&
    typeof x.booking_number === "string"
  );
}

/** ---------- handler ---------- */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return httpErr(res, 405, "Method not allowed");
  }

  try {
    const p = (req.body ?? {}) as Record<string, any>;

    // -------- server-side validation --------
    const contact_person = trimOrNull(p.contact_person);
    const customer_email = trimOrNull(p.customer_email);
    const raw_phone = p.customer_phone;
    const cleaned_phone = stripSpacesDashes(raw_phone);
    const passengers = toPosIntOrNull(p.passengers);

    const departure_place = trimOrNull(p.departure_place);
    const destination = trimOrNull(p.destination);
    const departure_date = trimOrNull(p.departure_date);
    const departure_time = tidyHHMM(p.departure_time);

    const problems: string[] = [];
    if (!contact_person) problems.push("Beställare saknas");
    if (!customer_email || !isEmailLike(customer_email)) problems.push("Ogiltig e-post");
    if (!cleaned_phone || !isPhoneLike(cleaned_phone)) problems.push("Ogiltigt telefonnummer");
    if (!passengers || passengers < 1) problems.push("Passagerare måste vara minst 1");

    if (!departure_place) problems.push("Utresa: Från saknas");
    if (!destination) problems.push("Utresa: Till saknas");
    if (!departure_date || !isISODateLike(departure_date)) problems.push("Utresa: Datum saknas/ogiltigt (YYYY-MM-DD)");
    if (!departure_time) problems.push("Utresa: Tid saknas/ogiltig (HH:MM)");

    // Retur: komplett om någon del finns
    const hasAnyReturn = !!(p.return_departure || p.return_destination || p.return_date || p.return_time);
    let return_departure = trimOrNull(p.return_departure);
    let return_destination = trimOrNull(p.return_destination);
    let return_date = trimOrNull(p.return_date);
    let return_time = tidyHHMM(p.return_time);

    if (hasAnyReturn) {
      if (!return_departure) problems.push("Retur: Från saknas");
      if (!return_destination) problems.push("Retur: Till saknas");
      if (!return_date || !isISODateLike(return_date)) problems.push("Retur: Datum saknas/ogiltigt (YYYY-MM-DD)");
      if (!return_time) problems.push("Retur: Tid saknas/ogiltig (HH:MM)");
    } else {
      return_departure = null;
      return_destination = null;
      return_date = null;
      return_time = null;
    }

    if (problems.length) {
      return httpErr(res, 400, `Kontrollera fälten:\n• ${problems.join("\n• ")}`);
    }

    // -------- bygg databasrecord --------
    const record = {
      booking_number: trimOrNull(p.booking_number) || null, // sätts i retry om null
      status: "bokad",

      // kund
      contact_person,
      customer_email,
      customer_phone: cleaned_phone,

      // utresa
      passengers,
      departure_place,
      destination,
      departure_date,
      departure_time,
      end_time: tidyHHMM(p.end_time),
      on_site_minutes: toPosIntOrNull(p.on_site_minutes),
      stopover_places: trimOrNull(p.stopover_places),

      // retur
      return_departure,
      return_destination,
      return_date,
      return_time,
      return_end_time: tidyHHMM(p.return_end_time),
      return_on_site_minutes: toPosIntOrNull(p.return_on_site_minutes),

      // interna
      assigned_vehicle_id: trimOrNull(p.assigned_vehicle_id),
      assigned_driver_id: trimOrNull(p.assigned_driver_id),

      // källa (offert)
      source_offer_id: trimOrNull(p.source_offer_id),

      // övrigt
      notes: trimOrNull(p.notes),

      // tidsstämplar
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // -------- robust BK-nummer med retry vid uniknyckel --------
    const MAX_TRIES = 5;
    let attempt = 0;
    let inserted: InsertedBooking | null = null;
    let lastErr: any = null;

    while (attempt < MAX_TRIES && !inserted) {
      attempt += 1;
      const bk = record.booking_number || generateBookingNo();

      const { data, error } = await supabaseAdmin
        .from("bookings")
        .insert({ ...record, booking_number: bk })
        .select(
          [
            "id",
            "booking_number",
            "customer_email",
            "passengers",
            "departure_place",
            "destination",
            "departure_date",
            "departure_time",
          ].join(",")
        )
        .single();

      if (!error && data) {
        const candidate = data as unknown;
        if (isInsertedBooking(candidate)) {
          inserted = candidate;
          break;
        } else {
          // Ov�ntad form – behandla som fel för att bryta snyggt
          lastErr = new Error("Ov�ntat insert-svar: saknar id/booking_number");
          break;
        }
      }

      const msg = String(error?.message || "");
      if (error?.code === "23505" || /duplicate key|unique constraint/i.test(msg)) {
        lastErr = error;
        // generera nytt och försök igen
        record.booking_number = null;
        continue;
      }

      if (error) {
        lastErr = error;
        break;
      }
    }

    if (!inserted) {
      throw lastErr || new Error("Kunde inte skapa bokning (okänt fel).");
    }

    // -------- Skicka bekräftelsemail (icke-blockerande) --------
    (async () => {
      try {
        if (inserted.customer_email) {
          await sendBookingMail({
            to: inserted.customer_email,
            bookingNumber: inserted.booking_number,
            passengers: inserted.passengers ?? null,
            from: (inserted.departure_place ?? null) as string | null,
            toPlace: (inserted.destination ?? null) as string | null,
            date: (inserted.departure_date ?? null) as string | null,
            time: (tidyHHMM(inserted.departure_time) ?? null) as string | null,
          });
        }
      } catch (e) {
        console.warn("sendBookingMail failed:", (e as any)?.message || e);
      }
    })();

    return res.status(201).json({ ok: true, booking: inserted });
  } catch (e: any) {
    console.error("/api/bookings/create error:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Serverfel" });
  }
}
