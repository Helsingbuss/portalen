import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/supabaseAdmin";

const db = requireAdmin();

function setCors(res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { data, error } = await db
    .from("shuttle_stops")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Public shuttle stops error:", error);
    return res.status(500).json({
      error: "Kunde inte hämta hållplatser.",
      details: error.message,
    });
  }

  return res.status(200).json({
    stops: data || [],
  });
}
