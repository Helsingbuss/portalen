import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/supabaseAdmin";

const db = requireAdmin();

function setCors(res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function toCard(row: any) {
  return {
    id: row.id,
    title: row.title ?? "",
    text: row.text ?? "",
    image: row.image_path ?? "",
    buttonText: row.button_text ?? "",
    buttonLink: row.button_link ?? "",
    active: Boolean(row.is_active),
    startDate: row.start_date ?? "",
    endDate: row.end_date ?? "",
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET", "OPTIONS"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const today = new Date().toISOString().slice(0, 10);

    const { data, error } = await db
      .from("shuttle_highlights")
      .select("*")
      .eq("is_active", true)
      .or(`start_date.is.null,start_date.lte.${today}`)
      .or(`end_date.is.null,end_date.gte.${today}`)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      cards: (data ?? []).map(toCard),
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message ?? "Unknown server error",
    });
  }
}
