import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

function cleanText(value: any) {
  const text = String(value ?? "").trim();
  return text || null;
}

function validDate(value: any) {
  const text = cleanText(value);
  if (!text) return null;

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!supabase) {
      return res.status(500).json({ ok: false, error: "Supabase-admin saknas" });
    }

    if (req.method === "GET") {
      const from = validDate(req.query.from);
      const to = validDate(req.query.to);

      let query = supabase
        .from("traffic_vehicle_blocks")
        .select(`
          *,
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
        .order("start_at", { ascending: true });

      if (from && to) {
        query = query.lt("start_at", to).gt("end_at", from);
      }

      const { data, error } = await query;

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        blocks: data || [],
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};

      const vehicleId = cleanText(body.vehicle_id);
      const title = cleanText(body.title);
      const startAt = validDate(body.start_at);
      const endAt = validDate(body.end_at);

      if (!vehicleId) {
        return res.status(400).json({ ok: false, error: "vehicle_id saknas." });
      }

      if (!title) {
        return res.status(400).json({ ok: false, error: "Titel saknas." });
      }

      if (!startAt || !endAt) {
        return res.status(400).json({ ok: false, error: "Start och slut måste anges." });
      }

      if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
        return res.status(400).json({ ok: false, error: "Sluttid måste vara efter starttid." });
      }

      const insertData = {
        vehicle_id: vehicleId,
        source_type: cleanText(body.source_type) || "manual",
        source_id: cleanText(body.source_id),
        title,
        reason: cleanText(body.reason),
        start_at: startAt,
        end_at: endAt,
        status: cleanText(body.status) || "reserved",
      };

      const { data, error } = await supabase
        .from("traffic_vehicle_blocks")
        .insert(insertData)
        .select(`
          *,
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

      return res.status(201).json({
        ok: true,
        block: data,
      });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (e: any) {
    console.error("/api/traffic/vehicle-blocks error:", e?.message || e);
    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte hantera fordonsblockering.",
    });
  }
}