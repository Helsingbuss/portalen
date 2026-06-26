import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";
import { logTrafficEvent } from "@/lib/traffic/logEvent";

const supabase =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

type SourceType = "helsingbuss" | "sundra" | "flygbuss";

function cleanText(value: any) {
  const text = String(value ?? "").trim();
  return text || null;
}

function cleanSourceType(value: any): SourceType | null {
  const text = cleanText(value);
  if (text === "helsingbuss" || text === "sundra" || text === "flygbuss") return text;
  return null;
}

function cleanStatus(value: any) {
  const status = cleanText(value) || "assigned";
  const allowed = ["planned", "assigned", "in_traffic", "completed", "cancelled", "needs_action"];
  return allowed.includes(status) ? status : "assigned";
}

function validDate(value: any) {
  const text = cleanText(value);
  if (!text) return null;

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
}

function blockSourceType(sourceType: SourceType) {
  if (sourceType === "helsingbuss") return "booking";
  return sourceType;
}

function blockStatusFromAssignment(status: string) {
  if (status === "in_traffic") return "in_traffic";
  if (status === "completed") return "in_traffic";
  return "reserved";
}

async function upsertVehicleBlock(input: {
  sourceType: SourceType;
  sourceId: string;
  vehicleId: string;
  title: string;
  startAt: string;
  endAt: string;
  status: string;
  notes: string | null;
}) {
  const source_type = blockSourceType(input.sourceType);
  const source_id = `${input.sourceType}:${input.sourceId}`;

  const blockData = {
    vehicle_id: input.vehicleId,
    source_type,
    source_id,
    title: input.title,
    reason: input.notes || "Kopplad från trafikledning.",
    start_at: input.startAt,
    end_at: input.endAt,
    status: blockStatusFromAssignment(input.status),
  };

  const existing = await supabase
    .from("traffic_vehicle_blocks")
    .select("id")
    .eq("source_type", source_type)
    .eq("source_id", source_id)
    .maybeSingle();

  if (existing.error) throw existing.error;

  if (existing.data?.id) {
    const { error } = await supabase
      .from("traffic_vehicle_blocks")
      .update(blockData)
      .eq("id", existing.data.id);

    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("traffic_vehicle_blocks")
    .insert(blockData);

  if (error) throw error;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!supabase) {
      return res.status(500).json({ ok: false, error: "Supabase-admin saknas" });
    }

    if (req.method === "GET") {
      const sourceType = cleanSourceType(req.query.source_type);
      const sourceId = cleanText(req.query.source_id);

      let query = supabase
        .from("traffic_trip_assignments")
        .select(`
          *,
          traffic_drivers (
            id,
            name,
            phone,
            email,
            status
          ),
          traffic_vehicles (
            id,
            name,
            registration_number,
            owner_type,
            partner_name,
            vehicle_type,
            seats,
            status
          )
        `)
        .order("created_at", { ascending: false });

      if (sourceType) query = query.eq("source_type", sourceType);
      if (sourceId) query = query.eq("source_id", sourceId);

      const { data, error } = await query;

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        assignments: data || [],
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};

      const sourceType = cleanSourceType(body.source_type);
      const sourceId = cleanText(body.source_id);

      if (!sourceType) {
        return res.status(400).json({
          ok: false,
          error: "source_type måste vara helsingbuss, sundra eller flygbuss.",
        });
      }

      if (!sourceId) {
        return res.status(400).json({
          ok: false,
          error: "source_id saknas.",
        });
      }

      const status = cleanStatus(body.status);
      const title = cleanText(body.title);
      const driverId = cleanText(body.driver_id);
      const vehicleId = cleanText(body.vehicle_id);
      const plannedStartAt = validDate(body.planned_start_at);
      const plannedEndAt = validDate(body.planned_end_at);
      const notes = cleanText(body.notes);

      const assignmentData = {
        source_type: sourceType,
        source_id: sourceId,
        title,
        driver_id: driverId,
        vehicle_id: vehicleId,
        status,
        planned_start_at: plannedStartAt,
        planned_end_at: plannedEndAt,
        notes,
      };

      const existing = await supabase
        .from("traffic_trip_assignments")
        .select("id")
        .eq("source_type", sourceType)
        .eq("source_id", sourceId)
        .maybeSingle();

      if (existing.error) throw existing.error;

      let saved;

      if (existing.data?.id) {
        const { data, error } = await supabase
          .from("traffic_trip_assignments")
          .update(assignmentData)
          .eq("id", existing.data.id)
          .select(`
            *,
            traffic_drivers (
              id,
              name,
              phone,
              email,
              status
            ),
            traffic_vehicles (
              id,
              name,
              registration_number,
              owner_type,
              partner_name,
              vehicle_type,
              seats,
              status
            )
          `)
          .single();

        if (error) throw error;
        saved = data;
      } else {
        const { data, error } = await supabase
          .from("traffic_trip_assignments")
          .insert(assignmentData)
          .select(`
            *,
            traffic_drivers (
              id,
              name,
              phone,
              email,
              status
            ),
            traffic_vehicles (
              id,
              name,
              registration_number,
              owner_type,
              partner_name,
              vehicle_type,
              seats,
              status
            )
          `)
          .single();

        if (error) throw error;
        saved = data;
      }

      if (vehicleId && plannedStartAt && plannedEndAt && status !== "cancelled") {
        await upsertVehicleBlock({
          sourceType,
          sourceId,
          vehicleId,
          title: title || "Kopplad körning",
          startAt: plannedStartAt,
          endAt: plannedEndAt,
          status,
          notes,
        });

        await supabase
          .from("traffic_vehicles")
          .update({
            status: status === "in_traffic" ? "in_traffic" : "reserved",
          })
          .eq("id", vehicleId);
      }

      if (driverId && (status === "assigned" || status === "in_traffic")) {
        await supabase
          .from("traffic_drivers")
          .update({
            status: status === "in_traffic" ? "busy" : "available",
          })
          .eq("id", driverId);
      }

      await logTrafficEvent(supabase, {
        event_type: "assignment",
        severity: "info",
        status: "resolved",
        source_type: sourceType,
        source_id: sourceId,
        title: `Körning kopplad: ${title || sourceId}`,
        message: [
          driverId ? "Chaufför vald" : "Ingen chaufför vald",
          vehicleId ? "Fordon valt" : "Inget fordon valt",
          `Status: ${status}`,
          notes ? `Notering: ${notes}` : null,
        ].filter(Boolean).join(" · "),
      });

      return res.status(200).json({
        ok: true,
        assignment: saved,
      });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (e: any) {
    console.error("/api/traffic/assignments error:", e?.message || e);
    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte spara körningskoppling.",
    });
  }
}