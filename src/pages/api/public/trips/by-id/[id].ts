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
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });
  }

  const { id } = req.query;
  const key = Array.isArray(id) ? id[0] : id;

  if (!key) {
    return res
      .status(400)
      .json({ ok: false, error: "Saknar id." });
  }

  try {
    // Tillåt både UUID (id) och slug
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        key
      );

    let query = supabase.from("trips").select("*");

    if (isUuid) {
      query = query.eq("id", key);
    } else {
      query = query.eq("slug", key);
    }

    const { data, error } = await query.single();

    if (error) throw error;
    if (!data) {
      return res
        .status(404)
        .json({ ok: false, error: "Resan hittades inte." });
    }

    // data innehåller nu departures & lines eftersom vi sparar dem i create.ts
    return res.status(200).json({ ok: true, trip: data });
  } catch (e: any) {
    console.error("public/trips/[id] error:", e);
    return res.status(500).json({
      ok: false,
      error: e?.message || "Tekniskt fel.",
    });
  }
}
