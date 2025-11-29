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
    return res
      .status(400)
      .json({ ok: false, error: "Missing id" });
  }

  try {
    const { data: trip, error: tripErr } = await supabase
      .from("trips")
      .select(
        [
          "id",
          "title",
          "subtitle",
          "hero_image",
          "ribbon",
          "badge",
          "trip_kind",
          "city",
          "country",
          "price_from",
          "year",
          "external_url",
          "summary",
          "published",
          "slug",
          "departures_coming_soon",
        ].join(",")
      )
      .eq("id", id)
      .single();

    if (tripErr) throw tripErr;
    if (!trip) {
      return res
        .status(404)
        .json({ ok: false, error: "Trip not found" });
    }

    const { data: deps, error: depsErr } = await supabase
      .from("trip_departures")
      .select("id, date, dep_date, dep_time, line_name, stops")
      .eq("trip_id", id)
      .order("date", { ascending: true })
      .limit(500);

    if (depsErr) throw depsErr;

    const out = {
      ...trip,
      departures: deps || [],
    };

    return res.status(200).json({ ok: true, trip: out });
  } catch (e: any) {
    console.error("/api/public/trips/[id] error:", e?.message || e);
    return res
      .status(200)
      .json({ ok: false, error: "Server error" });
  }
}
