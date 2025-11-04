import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

// Få en admin-klient oavsett hur du exponerar den i lib
const supabase =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

type BookingRow = {
  id: string;

  // vanliga fält
  booking_number?: string | null;   // BK25xxxx (om du har denna)
  contact_person?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;

  passengers?: number | null;
  notes?: string | null;

  departure_place?: string | null;
  destination?: string | null;
  departure_date?: string | null;   // YYYY-MM-DD
  departure_time?: string | null;   // HH:MM

  return_departure?: string | null;
  return_destination?: string | null;
  return_date?: string | null;
  return_time?: string | null;

  // ibland kan folk råka heta annorlunda
  from?: string | null;
  to?: string | null;
  date?: string | null;
  time?: string | null;

  end_time?: string | null;
  on_site_minutes?: number | null;
  stopover_places?: string | null;

  return_end_time?: string | null;
  return_on_site_minutes?: number | null;

  assigned_vehicle_id?: string | null;
  assigned_driver_id?: string | null;

  created_at?: string | null;
};

type BookingOption = {
  id: string;
  label: string;
  autofill: Record<string, any>;
};

type ErrorJson = { error: string };

function pick<T = any>(...vals: (T | null | undefined)[]) {
  for (const v of vals) if (v !== undefined && v !== null) return v as T;
  return null as any;
}

function fmtTime(t?: string | null) {
  if (!t) return "";
  return String(t).slice(0, 5); // HH:MM
}

function toOption(b: BookingRow): BookingOption {
  const num = b.booking_number ?? b.id;

  const out_from = pick(b.departure_place, b.from);
  const out_to = pick(b.destination, b.to);
  const out_date = pick(b.departure_date, b.date);
  const out_time = fmtTime(pick(b.departure_time, b.time));

  const ret_from = pick(b.return_departure, null);
  const ret_to = pick(b.return_destination, null);
  const ret_date = pick(b.return_date, null);
  const ret_time = fmtTime(pick(b.return_time, null));

  const labelParts = [
    num,
    out_date ? `${out_date} ${out_time}`.trim() : null,
    out_from && out_to ? `${out_from} → ${out_to}` : out_from || out_to,
    b.passengers ? `${b.passengers} pax` : null,
  ].filter(Boolean);

  const autofill = {
    out_from,
    out_to,
    out_date,
    out_time,

    ret_from,
    ret_to,
    ret_date,
    ret_time,

    passengers: b.passengers ?? null,
    contact_name: b.contact_person ?? null,
    contact_phone: b.customer_phone ?? null,
    vehicle_reg: null, // kopplas i ordern
    notes: b.notes ?? null,
  };

  return {
    id: String(b.id),
    label: labelParts.join(" — "),
    autofill,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ options: BookingOption[] } | ErrorJson>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const q = String(req.query.search ?? "").trim();
    if (!q || q.length < 2) {
      return res.status(200).json({ options: [] });
    }

    // Bas-selekt – välj alla fält vi använder (några kan saknas i din DB, det gör inget)
    const selectCols =
      "id, booking_number, contact_person, customer_email, customer_phone, passengers, notes, " +
      "departure_place, destination, departure_date, departure_time, " +
      "return_departure, return_destination, return_date, return_time, " +
      "from, to, date, time";

    // Försök med en bred OR-sökning (de kolumner som finns kommer matchas; om någon kolumn saknas
    // kan Postgres ge 42703 – då gör vi en fallback-sökning utan den kolumnen).
    const tryQuery = async (orExpr: string) => {
      return supabase
        .from("bookings")
        .select(selectCols)
        .or(orExpr)
        .order("created_at", { ascending: false, nullsFirst: false })
        .limit(20);
    };

    const exprs = [
      // full OR
      `booking_number.ilike.%${q}%,contact_person.ilike.%${q}%,customer_email.ilike.%${q}%,customer_phone.ilike.%${q}%,departure_place.ilike.%${q}%,destination.ilike.%${q}%`,
      // fallback 1: utan phone
      `booking_number.ilike.%${q}%,contact_person.ilike.%${q}%,customer_email.ilike.%${q}%,departure_place.ilike.%${q}%,destination.ilike.%${q}%`,
      // fallback 2: endast num + från/till
      `booking_number.ilike.%${q}%,departure_place.ilike.%${q}%,destination.ilike.%${q}%`,
      // fallback 3: endast num
      `booking_number.ilike.%${q}%`,
    ];

    let data: BookingRow[] | null = null;
    let lastErr: any = null;

    for (const ex of exprs) {
      const { data: d, error } = await tryQuery(ex);
      if (!error) {
        data = (d as BookingRow[]) || [];
        break;
      }
      // Om det är "kolumn saknas" – prova nästa variant
      const missingCol =
        error.code === "42703" ||
        /column .* does not exist/i.test(error.message || "");
      if (!missingCol) {
        lastErr = error;
        break;
      }
      lastErr = error;
    }

    if (!data) {
      if (lastErr) {
        console.error("/api/bookings/options error:", lastErr);
      }
      return res.status(200).json({ options: [] });
    }

    const options: BookingOption[] = data.map((o: BookingRow) => toOption(o));
    return res.status(200).json({ options });
  } catch (e: any) {
    console.error("/api/bookings/options fatal:", e?.message || e);
    return res.status(500).json({ error: "Internt fel" });
  }
}
