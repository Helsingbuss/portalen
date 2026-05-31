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
  const normalized = String(value).replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function buildInsertData(body: any) {
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

      if (!insertData.log_date) {
        return res.status(400).json({
          ok: false,
          error: "Datum saknas.",
        });
      }

      const { data, error } = await supabase
        .from("vehicle_environment_logs")
        .insert(insertData)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        log: data,
      });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const q = String(req.query.q || "").trim().toLowerCase();
    const status = String(req.query.status || "").trim();
    const fuelType = String(req.query.fuel_type || "").trim();
    const vehicleId = String(req.query.vehicle_id || "").trim();

    const { data: vehiclesData, error: vehiclesError } = await supabase
      .from("vehicles")
      .select("*")
      .order("vehicle_code", { ascending: true });

    if (vehiclesError) throw vehiclesError;

    let logsQuery = supabase
      .from("vehicle_environment_logs")
      .select("*")
      .order("log_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);

    if (status) logsQuery = logsQuery.eq("status", status);
    if (fuelType) logsQuery = logsQuery.eq("fuel_type", fuelType);
    if (vehicleId) logsQuery = logsQuery.eq("vehicle_id", vehicleId);

    const { data: logsData, error: logsError } = await logsQuery;

    if (logsError) {
      if (isMissingTableError(logsError)) {
        return res.status(200).json({
          ok: true,
          needsSetup: true,
          vehicles: vehiclesData || [],
          logs: [],
          summary: {
            total: 0,
            totalQuantity: 0,
            totalCost: 0,
            hvoQuantity: 0,
            dieselQuantity: 0,
            electricQuantity: 0,
            averageUnitPrice: 0,
          },
        });
      }

      throw logsError;
    }

    const vehicles = vehiclesData || [];
    let logs = logsData || [];

    if (q) {
      logs = logs.filter((row: any) => {
        const vehicle = vehicles.find((item: any) => item.id === row.vehicle_id);

        const haystack = [
          row.log_date,
          row.fuel_type,
          row.unit,
          row.supplier,
          row.station_location,
          row.price_source,
          row.euro_class,
          row.co2_note,
          row.environmental_note,
          row.status,
          row.notes,
          vehicle?.vehicle_code,
          vehicle?.registration_number,
          vehicle?.model,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      });
    }

    const totalQuantity = logs.reduce((sum: number, r: any) => sum + Number(r.quantity || 0), 0);
    const totalCost = logs.reduce((sum: number, r: any) => sum + Number(r.total_cost || 0), 0);

    const summary = {
      total: logs.length,
      totalQuantity,
      totalCost,
      hvoQuantity: logs
        .filter((r: any) => r.fuel_type === "hvo")
        .reduce((sum: number, r: any) => sum + Number(r.quantity || 0), 0),
      dieselQuantity: logs
        .filter((r: any) => r.fuel_type === "diesel")
        .reduce((sum: number, r: any) => sum + Number(r.quantity || 0), 0),
      electricQuantity: logs
        .filter((r: any) => r.fuel_type === "electric")
        .reduce((sum: number, r: any) => sum + Number(r.quantity || 0), 0),
      averageUnitPrice: totalQuantity > 0 ? Number((totalCost / totalQuantity).toFixed(2)) : 0,
    };

    return res.status(200).json({
      ok: true,
      needsSetup: false,
      vehicles,
      logs,
      summary,
    });
  } catch (error: any) {
    console.error("/api/admin/fordon/miljo error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera bränsle och miljö.",
    });
  }
}
