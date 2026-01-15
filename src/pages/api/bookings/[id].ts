// src/pages/api/bookings/[id].ts
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
    const q: any = supabase.from(table).select("*").eq("id", id);
    if (typeof q.maybeSingle === "function") {
      const { data, error } = await q.maybeSingle();
      if (error) return null;
      return pickLabel(data);
    }
    const { data, error } = await q.single();
    if (error) return null;
    return pickLabel(data);
  } catch {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<any | JsonError>) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    if (!supabase) {
      return res.status(500).json({ error: "Supabase-admin är inte korrekt initierad (kolla env och export)." });
    }

    const rawId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
    const id = String(rawId || "").trim();
    if (!id) return res.status(400).json({ error: "Saknar id" });

    const q = supabase
      .from("bookings")
      // ✅ välj explicit så du ser total_price i payload alltid
      .select("*");

    const { data, error } = isUUID(id)
      ? await q.eq("id", id).single()
      : await q.eq("booking_number", id).single();

    if (error) {
      const msg = String(error.message || "");
      if (/0 rows|Results contain 0 rows|No rows/i.test(msg)) return res.status(404).json({ error: "Bokning hittades inte" });
      throw error;
    }

    const driver_label = data?.assigned_driver_id ? await safeLookup("drivers", String(data.assigned_driver_id)) : null;
    const vehicle_label = data?.assigned_vehicle_id ? await safeLookup("vehicles", String(data.assigned_vehicle_id)) : null;

    return res.status(200).json({
      ok: true,
      booking: data,
      driver_label,
      vehicle_label,
    });
  } catch (e: any) {
    console.error("/api/bookings/[id] error:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Serverfel" });
  }
}
