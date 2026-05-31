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
  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({ ok: false, error: "Servicepost-ID saknas." });
  }

  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const { data: record, error: recordError } = await supabase
        .from("vehicle_service_records")
        .select("*")
        .eq("id", id)
        .single();

      if (recordError) throw recordError;

      const { data: vehicles, error: vehiclesError } = await supabase
        .from("vehicles")
        .select("*")
        .order("vehicle_code", { ascending: true });

      if (vehiclesError) throw vehiclesError;

      return res.status(200).json({
        ok: true,
        record,
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

      if (!updateData.service_date) {
        return res.status(400).json({
          ok: false,
          error: "Datum saknas.",
        });
      }

      const { data, error } = await supabase
        .from("vehicle_service_records")
        .update(updateData)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        record: data,
      });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (error: any) {
    console.error("/api/admin/fordon/service/[id] error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera serviceposten.",
    });
  }
}
