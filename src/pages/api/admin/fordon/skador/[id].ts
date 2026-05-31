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
    incident_date: cleanText(body.incident_date),
    incident_type: cleanText(body.incident_type) || "damage",
    location: cleanText(body.location),
    reported_by: cleanText(body.reported_by),
    title: cleanText(body.title),
    description: cleanText(body.description),
    action_taken: cleanText(body.action_taken),
    cost_amount: cleanNumber(body.cost_amount),
    insurance_case: cleanText(body.insurance_case),
    status: cleanText(body.status) || "open",
    notes: cleanText(body.notes),
    updated_at: new Date().toISOString(),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = String(req.query.id || "").trim();

  if (!id) {
    return res.status(400).json({ ok: false, error: "Skade-/incident-ID saknas." });
  }

  try {
    const supabase = getSupabase();

    if (req.method === "GET") {
      const { data: incident, error: incidentError } = await supabase
        .from("vehicle_incidents")
        .select("*")
        .eq("id", id)
        .single();

      if (incidentError) throw incidentError;

      const { data: vehicles, error: vehiclesError } = await supabase
        .from("vehicles")
        .select("*")
        .order("vehicle_code", { ascending: true });

      if (vehiclesError) throw vehiclesError;

      return res.status(200).json({
        ok: true,
        incident,
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

      if (!updateData.incident_date) {
        return res.status(400).json({
          ok: false,
          error: "Datum saknas.",
        });
      }

      if (!updateData.title) {
        return res.status(400).json({
          ok: false,
          error: "Rubrik saknas.",
        });
      }

      const { data, error } = await supabase
        .from("vehicle_incidents")
        .update(updateData)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        incident: data,
      });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (error: any) {
    console.error("/api/admin/fordon/skador/[id] error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera skadan/incidenten.",
    });
  }
}
