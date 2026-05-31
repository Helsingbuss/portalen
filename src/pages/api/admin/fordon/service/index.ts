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
  return {
    vehicle_id: cleanText(body.vehicle_id),
    record_type: cleanText(body.record_type) || "service",
    service_date: cleanText(body.service_date),
    odometer_km: cleanNumber(body.odometer_km),
    workshop: cleanText(body.workshop),
    cost_amount: cleanNumber(body.cost_amount),
    status: cleanText(body.status) || "planned",
    next_service_date: cleanText(body.next_service_date),
    next_service_km: cleanNumber(body.next_service_km),
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

      if (!insertData.service_date) {
        return res.status(400).json({
          ok: false,
          error: "Datum saknas.",
        });
      }

      const { data, error } = await supabase
        .from("vehicle_service_records")
        .insert(insertData)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        record: data,
      });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const q = String(req.query.q || "").trim().toLowerCase();
    const status = String(req.query.status || "").trim();
    const recordType = String(req.query.record_type || "").trim();
    const vehicleId = String(req.query.vehicle_id || "").trim();

    const { data: vehiclesData, error: vehiclesError } = await supabase
      .from("vehicles")
      .select("*")
      .order("vehicle_code", { ascending: true });

    if (vehiclesError) throw vehiclesError;

    let recordsQuery = supabase
      .from("vehicle_service_records")
      .select("*")
      .order("service_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);

    if (status) recordsQuery = recordsQuery.eq("status", status);
    if (recordType) recordsQuery = recordsQuery.eq("record_type", recordType);
    if (vehicleId) recordsQuery = recordsQuery.eq("vehicle_id", vehicleId);

    const { data: recordsData, error: recordsError } = await recordsQuery;

    if (recordsError) {
      if (isMissingTableError(recordsError)) {
        return res.status(200).json({
          ok: true,
          needsSetup: true,
          vehicles: vehiclesData || [],
          records: [],
          summary: {
            total: 0,
            planned: 0,
            completed: 0,
            inspections: 0,
            overdue: 0,
            totalCost: 0,
          },
        });
      }

      throw recordsError;
    }

    const vehicles = vehiclesData || [];
    let records = recordsData || [];

    if (q) {
      records = records.filter((row: any) => {
        const vehicle = vehicles.find((item: any) => item.id === row.vehicle_id);

        const haystack = [
          row.record_type,
          row.service_date,
          row.workshop,
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const summary = {
      total: records.length,
      planned: records.filter((r: any) => r.status === "planned" || r.status === "booked").length,
      completed: records.filter((r: any) => r.status === "completed").length,
      inspections: records.filter((r: any) => r.record_type === "inspection").length,
      overdue: records.filter((r: any) => {
        if (!r.service_date) return false;
        const d = new Date(r.service_date);
        d.setHours(0, 0, 0, 0);
        return d < today && r.status !== "completed" && r.status !== "cancelled";
      }).length,
      totalCost: records.reduce((sum: number, r: any) => sum + Number(r.cost_amount || 0), 0),
    };

    return res.status(200).json({
      ok: true,
      needsSetup: false,
      vehicles,
      records,
      summary,
    });
  } catch (error: any) {
    console.error("/api/admin/fordon/service error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera service och besiktning.",
    });
  }
}
