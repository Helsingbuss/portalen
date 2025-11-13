// src/pages/api/bookings/by-number.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/supabaseAdmin";

function isUndefinedColumn(err: any) {
  const m = String(err?.message || "").toLowerCase();
  return err?.code === "42703" || m.includes("does not exist") || m.includes("column");
}

// Tar "bk25- 1234", "Bk251234", "BK25 1234" -> "BK251234"
function normaliseBookingNo(v: string | undefined): string | null {
  if (!v) return null;
  const compact = v.replace(/[\s\-_]/g, "").toUpperCase();
  if (/^(BK)?[A-Z0-9]+$/.test(compact)) return compact.startsWith("BK") ? compact : `BK${compact}`;
  return null;
}

// Minimera payload (lägg till fält här vid behov)
const SELECT_COLS = [
  "id",
  "booking_number",
  "status",
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
  "notes",
  "assigned_driver_id",
  "assigned_vehicle_id",
  "created_at",
  "updated_at",
].join(",");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const db = requireAdmin();

    // Stöd både ?number= och ?no=
    const raw = (req.query.number as string) ?? (req.query.no as string) ?? "";
    const bookingNo = normaliseBookingNo(raw);

    if (!bookingNo) {
      return res.status(400).json({ error: "Ogiltigt eller saknat bokningsnummer." });
    }

    // Prova flera kolumnnamn (vanliga variationer)
    const cols = ["booking_number", "booking_no", "bookingid"];

    let row: any = null;
    let lastErr: any = null;

    for (const col of cols) {
      const { data, error } = await db
        .from("bookings")
        .select(SELECT_COLS)
        .ilike(col, bookingNo) // case-insensitive likamed (utan wildcard)
        .maybeSingle();

      if (!error && data) {
        row = data;
        break;
      }
      if (error && !isUndefinedColumn(error)) {
        lastErr = error;
      }
    }

    if (lastErr) throw lastErr;
    if (!row) return res.status(404).json({ error: "Bokningen hittades inte." });

    return res.status(200).json({ ok: true, booking: row });
  } catch (e: any) {
    console.error("/api/bookings/by-number error:", e?.message || e);
    return res.status(500).json({ error: "Kunde inte läsa bokningen." });
  }
}
