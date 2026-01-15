// src/pages/api/bookings/from-offer.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

type JsonError = { error: string };

function isUUID(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s || ""
  );
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
function generateBookingNo(): string {
  const yy = new Date().getFullYear().toString().slice(-2);
  const rnd = Math.floor(1000 + Math.random() * 9000);
  return `BK${yy}${rnd}`;
}
function toMoneyNumber(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim().replace(/\s+/g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any | JsonError>
) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { offerId, offerNumber, assigned_vehicle_id, assigned_driver_id, notes } =
      (req.body ?? {}) as Record<string, any>;

    if (!offerId && !offerNumber) {
      return res.status(400).json({ error: "Du måste ange offerId eller offerNumber" });
    }

    const selectCols = [
      "id",
      "offer_number",
      "status",
      "contact_person",
      "contact_email",
      "customer_email",
      "contact_phone",
      "customer_phone",
      "passengers",
      "notes",

      // totals
      "total_price",
      "grand_total",
      "total_amount",
      "total",

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

    if (!off) return res.status(404).json({ error: "Offert hittades inte" });

    const customer_phone_raw = off.contact_phone ?? off.customer_phone ?? null;
    const customer_phone = customer_phone_raw ? stripSpacesDashes(customer_phone_raw) : null;

    const total_price =
      toMoneyNumber(off.total_price) ??
      toMoneyNumber(off.grand_total) ??
      toMoneyNumber(off.total_amount) ??
      toMoneyNumber(off.total) ??
      0;

    const payloadBase: Record<string, any> = {
      status: "bokad",

      contact_person: trimOrNull(off.contact_person) ?? null,
      customer_email: trimOrNull(off.contact_email ?? off.customer_email) ?? null,
      customer_phone,

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

      return_departure: trimOrNull(off.return_departure),
      return_destination: trimOrNull(off.return_destination),
      return_date: trimOrNull(off.return_date),
      return_time: tidyHHMM(off.return_time),
      return_end_time: tidyHHMM(off.return_end_time),
      return_on_site_minutes:
        off.return_on_site_minutes === null || off.return_on_site_minutes === undefined
          ? null
          : toPosIntOrNull(off.return_on_site_minutes),

      assigned_vehicle_id: trimOrNull(assigned_vehicle_id),
      assigned_driver_id: trimOrNull(assigned_driver_id),

      notes: trimOrNull(notes ?? off.notes),

      // kopplingar i din tabell
      source_offer_id: off.id,
      offer_id: off.id,

      // totals i din tabell
      total_price,

      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

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
        .select("*")
        .single();

      if (!error && data) {
        created = data;
        break;
      }

      const msg = String(error?.message || "");
      if (error?.code === "23505" || /duplicate key|unique constraint/i.test(msg)) {
        lastErr = error;
        continue;
      }

      if (error) {
        lastErr = error;
        break;
      }
    }

    if (!created) throw lastErr || new Error("Kunde inte skapa bokning.");

    return res.status(201).json({ ok: true, booking: created });
  } catch (e: any) {
    console.error("from-offer error:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Serverfel" });
  }
}
