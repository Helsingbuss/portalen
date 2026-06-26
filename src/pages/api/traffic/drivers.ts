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

function cleanStatus(value: any) {
  const status = cleanText(value) || "available";
  const allowed = ["available", "busy", "off", "sick", "inactive"];
  return allowed.includes(status) ? status : "available";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!supabase) {
      return res.status(500).json({ ok: false, error: "Supabase-admin saknas" });
    }

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("traffic_drivers")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        drivers: data || [],
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const name = cleanText(body.name);

      if (!name) {
        return res.status(400).json({
          ok: false,
          error: "Chaufförens namn saknas.",
        });
      }

      const insertData = {
        name,
        phone: cleanText(body.phone),
        email: cleanText(body.email),
        status: cleanStatus(body.status),
        license_notes: cleanText(body.license_notes),
        notes: cleanText(body.notes),
      };

      const { data, error } = await supabase
        .from("traffic_drivers")
        .insert(insertData)
        .select("*")
        .single();

      if (error) throw error;

      await logTrafficEvent(supabase, {
        event_type: "driver",
        severity: "info",
        status: "resolved",
        source_type: "manual",
        source_id: data.id,
        title: `Förare skapad: ${data.name}`,
        message: data.phone || data.email ? `${data.phone || ""} ${data.email || ""}`.trim() : null,
      });

      return res.status(201).json({
        ok: true,
        driver: data,
      });
    }

    if (req.method === "PUT") {
      const body = req.body || {};
      const id = cleanText(body.id);

      if (!id) {
        return res.status(400).json({
          ok: false,
          error: "Chaufförens id saknas.",
        });
      }

      const updateData: Record<string, any> = {};

      if ("name" in body) updateData.name = cleanText(body.name);
      if ("phone" in body) updateData.phone = cleanText(body.phone);
      if ("email" in body) updateData.email = cleanText(body.email);
      if ("status" in body) updateData.status = cleanStatus(body.status);
      if ("license_notes" in body) updateData.license_notes = cleanText(body.license_notes);
      if ("notes" in body) updateData.notes = cleanText(body.notes);

      const { data, error } = await supabase
        .from("traffic_drivers")
        .update(updateData)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;

      await logTrafficEvent(supabase, {
        event_type: "driver",
        severity: "info",
        status: "resolved",
        source_type: "manual",
        source_id: data.id,
        title: `Förarstatus uppdaterad: ${data.name}`,
        message: `Ny status: ${data.status}`,
      });

      return res.status(200).json({
        ok: true,
        driver: data,
      });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (e: any) {
    console.error("/api/traffic/drivers error:", e?.message || e);
    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte hantera chaufförer.",
    });
  }
}