// src/pages/api/bookings/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/supabaseAdmin";

const db = requireAdmin();

type ApiOk = {
  ok: true;
  booking: any;
  driver_label?: string | null;
  vehicle_label?: string | null;
};
type ApiErr = { ok: false; error: string };

// Tillåt t.ex. "BK25XXXX" (enkelt mönster för dina BK-nummer)
function looksLikeBookingNo(v: string) {
  return /^BK[0-9A-Z\-_.]+$/i.test(v);
}
function isUUID(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s || "");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiOk | ApiErr>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const rawId = (req.query.id as string | undefined)?.trim();
  if (!rawId) {
    return res.status(400).json({ ok: false, error: "Missing booking id" });
  }

  try {
    const selectCols = [
      "id",
      "booking_number",
      "status",
      "passengers",
      "contact_person",
      "customer_email",
      "customer_phone",

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

      // övrigt & tilldelning
      "notes",
      "assigned_driver_id",
      "assigned_vehicle_id",

      // ev. redundanta fält om de finns kvar i din tabell
      "driver_name",
      "driver_phone",
      "vehicle_reg",
      "vehicle_model",

      "created_at",
      "updated_at",
    ].join(",");

    let data: any = null;
    let error: any = null;

    const candidate = rawId.trim();
    const isBk = looksLikeBookingNo(candidate);
    const isId = isUUID(candidate);

    if (isBk) {
      // 1) Primärt: hitta på booking_number (case-insensitive equality med ILIKE utan wildcard)
      const r1 = await db
        .from("bookings")
        .select(selectCols)
        .ilike("booking_number", candidate.toUpperCase())
        .maybeSingle();

      data = r1.data ?? null;
      error = r1.error ?? null;

      // Fallback till id om ingen träff
      if (!error && !data && isId) {
        const r2 = await db
          .from("bookings")
          .select(selectCols)
          .eq("id", candidate)
          .maybeSingle();
        data = r2.data ?? null;
        error = r2.error ?? null;
      }
    } else {
      // 2) Primärt: id-lookup om det ser ut som UUID
      if (isId) {
        const r = await db
          .from("bookings")
          .select(selectCols)
          .eq("id", candidate)
          .maybeSingle();
        data = r.data ?? null;
        error = r.error ?? null;
      }

      // Fallback: prova som booking_number ändå
      if (!error && !data) {
        const r2 = await db
          .from("bookings")
          .select(selectCols)
          .ilike("booking_number", candidate.toUpperCase())
          .maybeSingle();
        data = r2.data ?? null;
        error = r2.error ?? null;
      }
    }

    if (error) {
      return res.status(500).json({ ok: false, error: "Database error" });
    }
    if (!data) {
      return res.status(404).json({ ok: false, error: "Not found" });
    }

    // Best effort: etikett för tilldelad chaufför
    let driver_label: string | null = null;
    try {
      if (data.assigned_driver_id) {
        const d = await db
          .from("drivers")
          .select("id,name,label,email,active")
          .eq("id", data.assigned_driver_id)
          .maybeSingle();
        if (!d.error && d.data) {
          driver_label = d.data.label || d.data.name || d.data.email || null;
        }
      }
    } catch {
      /* tyst */
    }

    // Best effort: etikett för tilldelat fordon
    let vehicle_label: string | null = null;
    try {
      if (data.assigned_vehicle_id) {
        const v = await db
          .from("vehicles")
          .select("id,label,name,reg,registration")
          .eq("id", data.assigned_vehicle_id)
          .maybeSingle();
        if (!v.error && v.data) {
          vehicle_label = v.data.label || v.data.name || v.data.reg || v.data.registration || null;
        }
      }
    } catch {
      /* tyst */
    }

    return res.status(200).json({ ok: true, booking: data, driver_label, vehicle_label });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "Server error" });
  }
}
