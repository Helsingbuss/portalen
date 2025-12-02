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
    return res.status(400).json({ ok: false, error: "Missing id/slug" });
  }

  const key = String(id);

  try {
    // 🔎 hämta resa via id ELLER slug
    const { data: tripRow, error: tripErr } = await supabase
      .from("trips")
      .select("*")
      .or(`id.eq.${key},slug.eq.${key}`)
      .maybeSingle();

    if (tripErr) throw tripErr;
    if (!tripRow) {
      return res
        .status(404)
        .json({ ok: false, error: "Resan hittades inte." });
    }

    // 🔁 hämta avgångar
    const { data: depRows, error: depErr } = await supabase
      .from("trip_departures")
      .select("id, date, dep_time, line_name, stops")
      .eq("trip_id", tripRow.id)
      .order("date", { ascending: true });

    if (depErr) throw depErr;

    const departures =
      (depRows || []).map((d: any) => ({
        dep_date: d.date ? String(d.date).slice(0, 10) : "",
        dep_time: d.dep_time || "",
        line_name: d.line_name || "",
        stops: Array.isArray(d.stops) ? d.stops : [],
      })) || [];

    const trip = {
      ...tripRow,
      departures,
      lines: tripRow.lines || [],
    };

    return res.status(200).json({ ok: true, trip });
  } catch (e: any) {
    console.error("/api/public/trips/[id] error:", e?.message || e);
    return res
      .status(500)
      .json({ ok: false, error: "Server error" });
  }
}
