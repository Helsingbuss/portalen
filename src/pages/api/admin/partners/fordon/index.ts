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

function buildInsertData(body: any) {
  return {
    partner_id: cleanText(body.partner_id),
    name: cleanText(body.name),
    vehicle_name: cleanText(body.name) || cleanText(body.vehicle_name),
    vehicle_type: cleanText(body.vehicle_type) || "bus",
    registration_number: cleanText(body.registration_number),
    seats: cleanNumber(body.seats),
    environmental_class: cleanText(body.environmental_class),
    fuel_type: cleanText(body.fuel_type),
    comfort_level: cleanText(body.comfort_level) || "normal",
    status: cleanText(body.status) || "active",
    notes: cleanText(body.notes),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (req.method === "POST") {
      const insertData = buildInsertData(req.body || {});

      if (!insertData.partner_id) {
        return res.status(400).json({
          ok: false,
          error: "Operatör saknas.",
        });
      }

      if (!insertData.name) {
        return res.status(400).json({
          ok: false,
          error: "Fordonsnamn saknas.",
        });
      }

      const { data, error } = await supabase
        .from("app_partner_vehicles")
        .insert(insertData)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        vehicle: data,
      });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const q = String(req.query.q || "").trim().toLowerCase();
    const partnerId = String(req.query.partner_id || "").trim();
    const status = String(req.query.status || "").trim();

    const { data: operatorsData, error: operatorsError } = await supabase
      .from("app_partners")
      .select("*")
      .eq("partner_type", "operator")
      .order("name", { ascending: true });

    if (operatorsError) throw operatorsError;

    let vehicleQuery = supabase
      .from("app_partner_vehicles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (partnerId) vehicleQuery = vehicleQuery.eq("partner_id", partnerId);
    if (status) vehicleQuery = vehicleQuery.eq("status", status);

    const { data: vehiclesData, error: vehiclesError } = await vehicleQuery;

    if (vehiclesError) {
      if (isMissingTableError(vehiclesError)) {
        return res.status(200).json({
          ok: true,
          needsSetup: true,
          operators: operatorsData || [],
          vehicles: [],
          summary: {
            total: 0,
            active: 0,
            euro6: 0,
            seats: 0,
          },
        });
      }

      throw vehiclesError;
    }

    const operators = operatorsData || [];
    let vehicles = vehiclesData || [];

    if (q) {
      vehicles = vehicles.filter((row: any) => {
        const operator = operators.find((op: any) => op.id === row.partner_id);

        const haystack = [
          row.name,
          row.vehicle_name,
          row.vehicle_type,
          row.registration_number,
          row.environmental_class,
          row.fuel_type,
          row.comfort_level,
          row.status,
          row.notes,
          operator?.name,
          operator?.city,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      });
    }

    const summary = {
      total: vehicles.length,
      active: vehicles.filter((r: any) => r.status === "active").length,
      euro6: vehicles.filter((r: any) =>
        String(r.environmental_class || "").toLowerCase().includes("euro 6") ||
        String(r.environmental_class || "").toLowerCase().includes("euro6")
      ).length,
      seats: vehicles.reduce((sum: number, r: any) => sum + Number(r.seats || 0), 0),
    };

    return res.status(200).json({
      ok: true,
      needsSetup: false,
      operators,
      vehicles,
      summary,
    });
  } catch (error: any) {
    console.error("/api/admin/partners/fordon error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera fordon per operatör.",
    });
  }
}
