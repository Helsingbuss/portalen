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

      if (!insertData.incident_date) {
        return res.status(400).json({
          ok: false,
          error: "Datum saknas.",
        });
      }

      if (!insertData.title) {
        return res.status(400).json({
          ok: false,
          error: "Rubrik saknas.",
        });
      }

      const { data, error } = await supabase
        .from("vehicle_incidents")
        .insert(insertData)
        .select("*")
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        incident: data,
      });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const q = String(req.query.q || "").trim().toLowerCase();
    const status = String(req.query.status || "").trim();
    const incidentType = String(req.query.incident_type || "").trim();
    const vehicleId = String(req.query.vehicle_id || "").trim();

    const { data: vehiclesData, error: vehiclesError } = await supabase
      .from("vehicles")
      .select("*")
      .order("vehicle_code", { ascending: true });

    if (vehiclesError) throw vehiclesError;

    let incidentsQuery = supabase
      .from("vehicle_incidents")
      .select("*")
      .order("incident_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);

    if (status) incidentsQuery = incidentsQuery.eq("status", status);
    if (incidentType) incidentsQuery = incidentsQuery.eq("incident_type", incidentType);
    if (vehicleId) incidentsQuery = incidentsQuery.eq("vehicle_id", vehicleId);

    const { data: incidentsData, error: incidentsError } = await incidentsQuery;

    if (incidentsError) {
      if (isMissingTableError(incidentsError)) {
        return res.status(200).json({
          ok: true,
          needsSetup: true,
          vehicles: vehiclesData || [],
          incidents: [],
          summary: {
            total: 0,
            open: 0,
            inProgress: 0,
            closed: 0,
            insurance: 0,
            totalCost: 0,
          },
        });
      }

      throw incidentsError;
    }

    const vehicles = vehiclesData || [];
    let incidents = incidentsData || [];

    if (q) {
      incidents = incidents.filter((row: any) => {
        const vehicle = vehicles.find((item: any) => item.id === row.vehicle_id);

        const haystack = [
          row.incident_date,
          row.incident_type,
          row.location,
          row.reported_by,
          row.title,
          row.description,
          row.action_taken,
          row.insurance_case,
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

    const summary = {
      total: incidents.length,
      open: incidents.filter((r: any) => r.status === "open").length,
      inProgress: incidents.filter((r: any) => r.status === "in_progress").length,
      closed: incidents.filter((r: any) => r.status === "closed").length,
      insurance: incidents.filter((r: any) => Boolean(r.insurance_case)).length,
      totalCost: incidents.reduce((sum: number, r: any) => sum + Number(r.cost_amount || 0), 0),
    };

    return res.status(200).json({
      ok: true,
      needsSetup: false,
      vehicles,
      incidents,
      summary,
    });
  } catch (error: any) {
    console.error("/api/admin/fordon/skador error", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte hantera skador och incidenter.",
    });
  }
}
