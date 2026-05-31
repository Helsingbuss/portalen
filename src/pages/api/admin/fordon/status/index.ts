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

function isMissingTableError(error: any) {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();

  return (
    code === "42p01" ||
    code === "pgrst205" ||
    message.includes("does not exist") ||
    message.includes("could not find the table") ||
    (message.includes("relation") && message.includes("does not exist"))
  );
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

function buildInsertData(body: any) {
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
  try {
    const supabase = getSupabase();

    if (req.method === "POST") {
      const insertData = buildInsertData(req.body || {});

      if (!insertData.vehicle_id) {
        return res.status(400).json({
          ok: false,
          error: "Fordon saknas.",
        });
      }

      if (!insertData.check_date) {
        return res.status(400).json({
          ok: false,
          error: "Kontrolldatum saknas.",
        });
      }

      const { data, error } = await supabase
        .from("vehicle_checks")
        .insert(insertData)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        check: data,
      });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const q = String(req.query.q || "").trim().toLowerCase();
    const status = String(req.query.status || "").trim();
    const vehicleId = String(req.query.vehicle_id || "").trim();

    const { data: vehiclesData, error: vehiclesError } = await supabase
      .from("vehicles")
      .select("*")
      .order("vehicle_code", { ascending: true });

    if (vehiclesError) throw vehiclesError;

    let checksQuery = supabase
      .from("vehicle_checks")
      .select("*")
      .order("check_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);

    if (status) checksQuery = checksQuery.eq("status", status);
    if (vehicleId) checksQuery = checksQuery.eq("vehicle_id", vehicleId);

    const { data: checksData, error: checksError } = await checksQuery;

    if (checksError) {
      if (isMissingTableError(checksError)) {
        return res.status(200).json({
          ok: true,
          needsSetup: true,
          vehicles: vehiclesData || [],
          checks: [],
          summary: {
            total: 0,
            today: 0,
            approved: 0,
            needsAction: 0,
            blocked: 0,
          },
        });
      }

      throw checksError;
    }

    const vehicles = vehiclesData || [];
    let checks = checksData || [];

    if (q) {
      checks = checks.filter((row: any) => {
        const vehicle = vehicles.find((item: any) => item.id === row.vehicle_id);

        const haystack = [
          row.check_date,
          row.checked_by,
          row.fuel_level,
          row.cleanliness_status,
          row.damage_notes,
          row.status,
          row.notes,
          vehicle?.vehicle_code,
          vehicle?.registration_number,
          vehicle?.model,
          vehicle?.vehicle_type,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      });
    }

    const today = new Date().toISOString().slice(0, 10);

    const summary = {
      total: checks.length,
      today: checks.filter((r: any) => String(r.check_date || "").slice(0, 10) === today).length,
      approved: checks.filter((r: any) => r.status === "approved").length,
      needsAction: checks.filter((r: any) => r.status === "needs_action").length,
      blocked: checks.filter((r: any) => r.status === "blocked").length,
    };

    return res.status(200).json({
      ok: true,
      needsSetup: false,
      vehicles,
      checks,
      summary,
    });
  } catch (error: any) {
    console.error("/api/admin/fordon/status error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera fordonsstatus/checklistor.",
    });
  }
}
