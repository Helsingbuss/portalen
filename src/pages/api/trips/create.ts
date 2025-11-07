// src/pages/api/trips/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    if (!url || !serviceKey) return res.status(500).json({ error: "Servern saknar Supabase-inställningar." });

    const supabase = createClient(url, serviceKey);

    const {
      title, subtitle, trip_kind, badge, ribbon, city, country,
      price_from, hero_image, published
    } = req.body || {};

    if (!title) return res.status(400).json({ error: "Titel krävs." });
    if (!hero_image) return res.status(400).json({ error: "Bild krävs." });

    const { data, error } = await supabase
      .from("trips")
      .insert([{
        title,
        subtitle,
        trip_kind,          // 'flerdagar' | 'dagsresa' | 'shopping'
        badge,
        ribbon,
        city,
        country,
        price_from: price_from == null ? null : Number(price_from),
        hero_image,
        published: !!published,
      }])
      .select("id")
      .single();

    if (error) throw error;

    return res.status(200).json({ ok: true, id: data?.id });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Något gick fel." });
  }
}
