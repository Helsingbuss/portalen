// src/pages/api/public/trips/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS för widget
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  // cache: 1 min + SWR 5 min
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 12));

  try {
    // Viktigt: använd * för att undvika fel om vissa kolumner inte finns (t.ex. next_date)
    // Vi filtrerar och mappar säkert nedan istället.
    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return res.status(500).json({ ok: false, error: error.message });

    const trips = (data || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      subtitle: t?.subtitle ?? undefined,         // “Kort om resan”
      image: t?.hero_image ?? undefined,
      ribbon: t?.ribbon ?? undefined,             // valfri kampanjtext
      badge: t?.trip_kind ?? undefined,           // dagsresa/shopping/flerdagar
      city: t?.city ?? undefined,
      country: t?.country ?? undefined,
      year: t?.year ?? undefined,                 // om du skapat kolumn
      price_from: t?.price_from ?? undefined,
      // next_date: saknas i din DB → lämna undefined (widgeten klarar det)
      next_date: undefined,
      external_url: t?.external_url ?? undefined, // ← används för korrekt länk
    }));

    return res.status(200).json({ ok: true, trips });
  } catch (e: any) {
    console.error("/api/public/trips index fail:", e?.message || e);
    return res.status(500).json({ ok: false, error: "Serverfel" });
  }
}
