import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

type JsonError = { error: string };

function isUUID(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s || "");
}

function pickLabel(row: any): string | null {
  if (!row) return null;
  return (
    row.label ??
    row.name ??
    row.full_name ??
    row.title ??
    row.registration_number ??
    row.reg_no ??
    row.plate ??
    row.number ??
    null
  );
}

async function safeLookup(table: string, id: string): Promise<string | null> {
  if (!supabase || !id) return null;
  try {
    const base = supabase.from(table).select("*").eq("id", id);
    const hasMaybeSingle = "maybeSingle" in (base as any);

    if (hasMaybeSingle) {
      const { data, error } = await (base as any).maybeSingle();
      if (error) return null;
      return pickLabel(data);
    } else {
      const r = await base.single();
      if (r.error) return null;
      return pickLabel(r.data);
    }
  } catch {
    return null;
  }
}

function toNull(v: any) {
  return v === "" || v === undefined ? null : v;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any | JsonError>
) {
  try {
    if (!supabase) {
      return res.status(500).json({ error: "Supabase-admin är inte korrekt initierad." });
    }

    const rawId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
    const id = String(rawId || "").trim();
    if (!id) return res.status(400).json({ error: "Saknar id" });

    const keyCol = isUUID(id) ? "id" : "booking_number";

    // -------- GET --------
    if (req.method === "GET") {
      const q = supabase.from("bookings").select("*");
      const { data, error } = await q.eq(keyCol, id).single();

      if (error) {
        const msg = String(error.message || "");
        if (/0 rows|Results contain 0 rows|No rows/i.test(msg)) {
          return res.status(404).json({ error: "Bokning hittades inte" });
        }
        throw error;
      }

      const driver_label = data?.assigned_driver_id
        ? await safeLookup("drivers", String(data.assigned_driver_id))
        : null;

      const vehicle_label = data?.assigned_vehicle_id
        ? await safeLookup("vehicles", String(data.assigned_vehicle_id))
        : null;

      return res.status(200).json({ ok: true, booking: data, driver_label, vehicle_label });
    }

    // -------- PUT (update) --------
    if (req.method === "PUT") {
      const p = req.body ?? {};

      // whitelista fält du vill tillåta att redigera
      const update = {
        status: toNull(p.status),

        contact_person: toNull(p.contact_person),
        customer_email: toNull(p.customer_email),
        customer_phone: toNull(p.customer_phone),

        passengers: p.passengers === "" || p.passengers === undefined ? null : p.passengers,

        departure_place: toNull(p.departure_place),
        destination: toNull(p.destination),
        departure_date: toNull(p.departure_date),
        departure_time: toNull(p.departure_time),
        end_time: toNull(p.end_time),
        on_site_minutes: p.on_site_minutes === "" || p.on_site_minutes === undefined ? null : p.on_site_minutes,
        stopover_places: toNull(p.stopover_places),

        return_departure: toNull(p.return_departure),
        return_destination: toNull(p.return_destination),
        return_date: toNull(p.return_date),
        return_time: toNull(p.return_time),
        return_end_time: toNull(p.return_end_time),
        return_on_site_minutes:
          p.return_on_site_minutes === "" || p.return_on_site_minutes === undefined ? null : p.return_on_site_minutes,

        notes: toNull(p.notes),

        assigned_driver_id: toNull(p.assigned_driver_id),
        assigned_vehicle_id: toNull(p.assigned_vehicle_id),

        total_price: p.total_price === "" || p.total_price === undefined ? null : p.total_price,

        updated_at: new Date().toISOString(),
      } as Record<string, any>;

      const { data, error } = await supabase
        .from("bookings")
        .update(update)
        .eq(keyCol, id)
        .select("*")
        .single();

      if (error) throw error;
      return res.status(200).json({ ok: true, booking: data });
    }

    // -------- DELETE --------
    if (req.method === "DELETE") {
      const { data, error } = await supabase
        .from("bookings")
        .delete()
        .eq(keyCol, id)
        .select("id")
        .single();

      if (error) throw error;
      return res.status(200).json({ ok: true, deleted: data });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e: any) {
    console.error("/api/bookings/[id] error:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Serverfel" });
  }
}
