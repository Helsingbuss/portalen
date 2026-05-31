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
  const normalized = String(value).replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function buildUpdateData(body: any) {
  const quantity = cleanNumber(body.quantity);
  const unitPrice = cleanNumber(body.unit_price);
  const manualTotal = cleanNumber(body.total_cost);

  return {
    vehicle_id: cleanText(body.vehicle_id),
    log_date: cleanText(body.log_date),
    odometer_km: cleanNumber(body.odometer_km),

    fuel_type: cleanText(body.fuel_type) || "hvo",
    quantity,
    unit: cleanText(body.unit) || "liter",
    unit_price: unitPrice,
    total_cost: manualTotal ?? (quantity && unitPrice ? Number((quantity * unitPrice).toFixed(2)) : null),

    supplier: cleanText(body.supplier),
    station_location: cleanText(body.station_location),
    price_source: cleanText(body.price_source),

    euro_class: cleanText(body.euro_class),
    co2_note: cleanText(body.co2_note),
    environmental_note: cleanText(body.environmental_note),

    status: cleanText(body.status) || "registered",
    notes: cleanText(body.notes),
    updated_at: new Date().toISOString(),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({ ok: false, error: "Bränslepost-ID saknas." });
  }

  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const { data: log, error: logError } = await supabase
        .from("vehicle_environment_logs")
        .select("*")
        .eq("id", id)
        .single();

      if (logError) throw logError;

      const { data: vehicles, error: vehiclesError } = await supabase
        .from("vehicles")
        .select("*")
        .order("vehicle_code", { ascending: true });

      if (vehiclesError) throw vehiclesError;

      return res.status(200).json({
        ok: true,
        log,
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

      if (!updateData.log_date) {
        return res.status(400).json({
          ok: false,
          error: "Datum saknas.",
        });
      }

      const { data, error } = await supabase
        .from("vehicle_environment_logs")
        .update(updateData)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        log: data,
      });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (error: any) {
    console.error("/api/admin/fordon/miljo/[id] error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera bränsleposten.",
    });
  }
}
