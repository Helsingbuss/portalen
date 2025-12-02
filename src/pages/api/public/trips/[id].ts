// src/pages/api/public/trips/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

function setCORS(res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });
  }

  const { id } = req.query;
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ ok: false, error: "Saknar id." });
  }

  try {
    const { data: trip, error: tripErr } = await supabase
      .from("trips")
      .select(
        [
          "id",
          "title",
          "subtitle",
          "trip_kind",
          "badge",
          "ribbon",
          "city",
          "country",
          "price_from",
          "hero_image",
          "published",
          "external_url",
          "year",
          "summary",
          "slug",
          "departures_coming_soon",
          "lines", // 👈 viktig
        ].join(",")
      )
      .eq("id", id)
      .single();

    if (tripErr || !trip) {
      throw tripErr || new Error("Resa hittades inte.");
    }

    const { data: deps, error: depsErr } = await supabase
      .from("trip_departures")
      .select("date")
      .eq("trip_id", trip.id)
      .order("date", { ascending: true });

    if (depsErr) throw depsErr;

    const departures = (deps || []).map((d: any) => ({
      date: d.date,
    }));

    return res.status(200).json({
      ok: true,
      trip: {
        ...trip,
        departures,
      },
    });
  } catch (e: any) {
    console.error("/api/public/trips/[id] error:", e?.message || e);
    return res
      .status(500)
      .json({ ok: false, error: "Server error" });
  }
}
