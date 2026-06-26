import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";
import { logTrafficEvent } from "@/lib/traffic/logEvent";

const supabase =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

function cleanText(value: any) {
  const text = String(value ?? "").trim();
  return text || null;
}

function numberOrNull(value: any) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function cleanStatus(value: any) {
  const status = cleanText(value) || "available";
  const allowed = ["available", "in_traffic", "reserved", "workshop", "unavailable", "inactive"];
  return allowed.includes(status) ? status : "available";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!supabase) {
      return res.status(500).json({ ok: false, error: "Supabase-admin saknas" });
    }

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("traffic_vehicles")
        .select("*")
        .order("owner_type", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        vehicles: data || [],
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const name = cleanText(body.name);

      if (!name) {
        return res.status(400).json({
          ok: false,
          error: "Fordonsnamn saknas.",
        });
      }

      const ownerType = body.owner_type === "partner" ? "partner" : "own";

      const insertData = {
        name,
        registration_number: cleanText(body.registration_number),
        owner_type: ownerType,
        partner_name: ownerType === "partner" ? cleanText(body.partner_name) : null,
        vehicle_type: cleanText(body.vehicle_type) || "bus",
        seats: numberOrNull(body.seats),
        status: cleanStatus(body.status),
        notes: cleanText(body.notes),
      };

      const { data, error } = await supabase
        .from("traffic_vehicles")
        .insert(insertData)
        .select("*")
        .single();

      if (error) throw error;

      await logTrafficEvent(supabase, {
        event_type: "vehicle",
        severity: "info",
        status: "resolved",
        source_type: "manual",
        source_id: data.id,
        title: `Fordon skapat: ${data.name}`,
        message: data.owner_type === "partner" ? `Partner: ${data.partner_name || "Ej angiven"}` : "Eget fordon",
      });

      return res.status(201).json({
        ok: true,
        vehicle: data,
      });
    }

    if (req.method === "PUT") {
      const body = req.body || {};
      const id = cleanText(body.id);

      if (!id) {
        return res.status(400).json({
          ok: false,
          error: "Fordons-id saknas.",
        });
      }

      const updateData: Record<string, any> = {};

      if ("name" in body) updateData.name = cleanText(body.name);
      if ("registration_number" in body) updateData.registration_number = cleanText(body.registration_number);
      if ("partner_name" in body) updateData.partner_name = cleanText(body.partner_name);
      if ("vehicle_type" in body) updateData.vehicle_type = cleanText(body.vehicle_type) || "bus";
      if ("seats" in body) updateData.seats = numberOrNull(body.seats);
      if ("status" in body) updateData.status = cleanStatus(body.status);
      if ("notes" in body) updateData.notes = cleanText(body.notes);

      const { data, error } = await supabase
        .from("traffic_vehicles")
        .update(updateData)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      await logTrafficEvent(supabase, {
        event_type: "vehicle",
        severity: data.status === "workshop" || data.status === "unavailable" ? "warning" : "info",
        status: "resolved",
        source_type: "manual",
        source_id: data.id,
        title: `Fordonsstatus uppdaterad: ${data.name}`,
        message: `Ny status: ${data.status}`,
      });

      return res.status(200).json({
        ok: true,
        vehicle: data,
      });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (e: any) {
    console.error("/api/traffic/vehicles error:", e?.message || e);
    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte hantera fordon.",
    });
  }
}