import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("sundra_campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        campaigns: data || [],
      });
    }

    if (req.method === "POST") {
      const body = req.body || {};

      if (!body.code?.trim()) {
        return res.status(400).json({
          ok: false,
          error: "Rabattkod saknas.",
        });
      }

      if (!body.name?.trim()) {
        return res.status(400).json({
          ok: false,
          error: "Kampanjnamn saknas.",
        });
      }

      const { data, error } = await supabase
        .from("sundra_campaigns")
        .insert({
          code: String(body.code).trim().toUpperCase(),
          name: body.name,
          description: body.description || null,

          discount_type: body.discount_type || "percent",
          discount_value: Number(body.discount_value || 0),

          applies_to: body.applies_to || "all",
          trip_id: body.trip_id || null,

          starts_at: body.starts_at || null,
          ends_at: body.ends_at || null,

          max_uses: body.max_uses ?? null,
          used_count: 0,

          status: body.status || "active",
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        ok: true,
        campaign: data,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (e: any) {
    console.error("/api/admin/sundra/campaigns error:", e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte hantera kampanjer.",
    });
  }
}
