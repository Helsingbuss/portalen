// src/pages/api/trips/get.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { id } = req.query as { id?: string };
  if (!id) {
    return res.status(400).json({ ok: false, error: "Missing id" });
  }

  try {
    const { data, error } = await supabase
      .from("trips")
      .select(
        `
        id,
        title,
        subtitle,
        trip_kind,
        country,
        year,
        price_from,
        badge,
        badge_bg,
        badge_fg,
        city,
        hero_image,
        external_link,
        published
      `
      )
      .eq("id", id)
      .single();

    if (error || !data) {
      return res.status(404).json({ ok: false, error: "Resa hittades inte" });
    }

    return res.status(200).json({ ok: true, trip: data });
  } catch (e: any) {
    console.error("/api/trips/get", e?.message || e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
