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

function buildVehicleData(body: any) {
  return {
    vehicle_code: cleanText(body.vehicle_code),
    registration_number: cleanText(body.registration_number),
    model: cleanText(body.model),
    vehicle_type: cleanText(body.vehicle_type) || "Turistbuss",
    km: cleanNumber(body.km) || 0,
    next_service_km: cleanNumber(body.next_service_km),
    status: cleanText(body.status) || "available",
    notes: cleanText(body.notes),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = getSupabase();

    if (req.method === "POST") {
      const insertData = buildVehicleData(req.body || {});

      if (!insertData.vehicle_code) {
        return res.status(400).json({
          ok: false,
          error: "Fordonsnummer saknas.",
        });
      }

      const { data, error } = await supabase
        .from("vehicles")
        .insert(insertData)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        vehicle: data,
      });
    }

    if (req.method === "PUT") {
      const id = cleanText(req.body?.id);

      if (!id) {
        return res.status(400).json({
          ok: false,
          error: "Fordons-ID saknas.",
        });
      }

      const updateData = buildVehicleData(req.body || {});

      if (!updateData.vehicle_code) {
        return res.status(400).json({
          ok: false,
          error: "Fordonsnummer saknas.",
        });
      }

      const { data, error } = await supabase
        .from("vehicles")
        .update(updateData)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        vehicle: data,
      });
    }

    if (req.method === "DELETE") {
      const id = cleanText(req.body?.id);

      if (!id) {
        return res.status(400).json({
          ok: false,
          error: "Fordons-ID saknas.",
        });
      }

      const { error } = await supabase.from("vehicles").delete().eq("id", id);

      if (error) throw error;

      return res.status(200).json({
        ok: true,
      });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const q = String(req.query.q || "").trim().toLowerCase();
    const status = String(req.query.status || "").trim();

    let query = supabase
      .from("vehicles")
      .select("*")
      .order("vehicle_code", { ascending: true })
      .limit(500);

    if (status) query = query.eq("status", status);

    const { data, error } = await query;

    if (error) {
      if (isMissingTableError(error)) {
        return res.status(200).json({
          ok: true,
          needsSetup: true,
          vehicles: [],
          summary: {
            total: 0,
            available: 0,
            inTraffic: 0,
            serviceSoon: 0,
            inactive: 0,
            totalKm: 0,
          },
        });
      }

      throw error;
    }

    let vehicles = data || [];

    if (q) {
      vehicles = vehicles.filter((row: any) => {
        const haystack = [
          row.vehicle_code,
          row.registration_number,
          row.model,
          row.vehicle_type,
          row.status,
          row.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      });
    }

    const summary = {
      total: vehicles.length,
      available: vehicles.filter((r: any) => r.status === "available").length,
      inTraffic: vehicles.filter((r: any) => r.status === "in_traffic").length,
      serviceSoon: vehicles.filter((r: any) => r.status === "service_soon").length,
      inactive: vehicles.filter((r: any) => r.status === "inactive").length,
      totalKm: vehicles.reduce((sum: number, r: any) => sum + Number(r.km || 0), 0),
    };

    return res.status(200).json({
      ok: true,
      needsSetup: false,
      vehicles,
      summary,
    });
  } catch (error: any) {
    console.error("/api/admin/fordon/flotta error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera fordonsflottan.",
    });
  }
}
