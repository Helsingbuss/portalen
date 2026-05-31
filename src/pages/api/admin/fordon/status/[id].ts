import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase env saknas. Admin kräver SUPABASE_SERVICE_ROLE_KEY eller SUPABASE_SERVICE_KEY i .env.local."
    );
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function cleanText(value: any) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function cleanNumber(value: any) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function cleanBool(value: any) {
  return value === true || value === "true";
}

function buildUpdateData(body: any) {
  return {
    vehicle_id: cleanText(body.vehicle_id),
    check_date: cleanText(body.check_date),
    checked_by: cleanText(body.checked_by),
    odometer_km: cleanNumber(body.odometer_km),
    fuel_level: cleanText(body.fuel_level),
    cleanliness_status: cleanText(body.cleanliness_status),
    exterior_ok: cleanBool(body.exterior_ok),
    interior_ok: cleanBool(body.interior_ok),
    tires_ok: cleanBool(body.tires_ok),
    lights_ok: cleanBool(body.lights_ok),
    belts_ok: cleanBool(body.belts_ok),
    wc_ok: cleanBool(body.wc_ok),
    documents_ok: cleanBool(body.documents_ok),
    damage_notes: cleanText(body.damage_notes),
    status: cleanText(body.status) || "approved",
    notes: cleanText(body.notes),
    updated_at: new Date().toISOString(),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({ ok: false, error: "Kontroll-ID saknas." });
  }

  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const { data: check, error: checkError } = await supabase
        .from("vehicle_checks")
        .select("*")
        .eq("id", id)
        .single();

      if (checkError) throw checkError;

      const { data: vehicles, error: vehiclesError } = await supabase
        .from("vehicles")
        .select("*")
        .order("vehicle_code", { ascending: true });

      if (vehiclesError) throw vehiclesError;

      return res.status(200).json({
        ok: true,
        check,
        vehicles: vehicles || [],
      });
    }

    if (req.method === "PUT") {
      const updateData = buildUpdateData(req.body || {});

      if (!updateData.vehicle_id) {
        return res.status(400).json({
          ok: false,
          error: "Fordon saknas.",
        });
      }

      if (!updateData.check_date) {
        return res.status(400).json({
          ok: false,
          error: "Kontrolldatum saknas.",
        });
      }

      const { data, error } = await supabase
        .from("vehicle_checks")
        .update(updateData)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        check: data,
      });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (error: any) {
    console.error("/api/admin/fordon/status/[id] error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera fordonskontrollen.",
    });
  }
}
