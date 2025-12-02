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
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { id } = req.query;
  const key = Array.isArray(id) ? id[0] : id;
  if (!key) {
    return res.status(400).json({ ok: false, error: "Saknar id." });
  }

  try {
    // Hämta själva resan – matcha både på id och slug
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
          "departures_coming_soon",
          "slug",
          "lines",
        ].join(",")
      )
      .or(`id.eq.${key},slug.eq.${key}`)
      .limit(1)
      .single();

    if (tripErr) throw tripErr;
    if (!trip) {
      return res
        .status(404)
        .json({ ok: false, error: "Resan kunde inte hittas." });
    }

    // Hämta avgångar för den här resan
    const { data: deps, error: depsErr } = await supabase
      .from("trip_departures")
      .select("id, trip_id, date, depart_date, dep_date, departure_date")
      .eq("trip_id", trip.id)
      .order("date", { ascending: true });

    if (depsErr) throw depsErr;

    // Mappa till formen som admin-formuläret förväntar sig (DepartureRow)
    const departures = (deps || [])
      .map((row: any) => {
        const raw =
          row.date ||
          row.depart_date ||
          row.dep_date ||
          row.departure_date ||
          null;
        const s = raw ? String(raw).slice(0, 10) : "";
        if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
        return {
          dep_date: s,
          dep_time: "",
          line_name: "",
          stops: [],
        };
      })
      .filter(Boolean);

    return res.status(200).json({
      ok: true,
      trip: {
        ...trip,
        departures,
      },
    });
  } catch (e: any) {
    console.error("/api/public/trips/[id] error:", e);
    return res
      .status(500)
      .json({ ok: false, error: e?.message || "Serverfel vid hämtning." });
  }
}
