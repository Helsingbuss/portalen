import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/supabaseAdmin";

const db = requireAdmin();

type HighlightCardInput = {
  id?: number | string;
  title?: string;
  text?: string;
  image?: string;
  buttonText?: string;
  buttonLink?: string;
  active?: boolean;
  startDate?: string;
  endDate?: string;
  sortOrder?: number | string;
};

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
    sortOrder: Number(row.sort_order ?? 100),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      const { data, error } = await db
        .from("shuttle_highlights")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true });

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({
        cards: (data ?? []).map(toCard),
      });
    }

    if (req.method === "PUT") {
      const cards = Array.isArray(req.body?.cards)
        ? (req.body.cards as HighlightCardInput[])
        : [];

      const rows = cards.map((card, index) => ({
        sort_order: Number(card.sortOrder ?? index + 1) || index + 1,
        title: String(card.title ?? ""),
        text: String(card.text ?? ""),
        image_path: String(card.image ?? ""),
        button_text: String(card.buttonText ?? ""),
        button_link: String(card.buttonLink ?? ""),
        is_active: Boolean(card.active),
        start_date: card.startDate ? String(card.startDate) : null,
        end_date: card.endDate ? String(card.endDate) : null,
      }));

      const deleteResult = await db
        .from("shuttle_highlights")
        .delete()
        .gte("id", 0);

      if (deleteResult.error) {
        return res.status(500).json({ error: deleteResult.error.message });
      }

      if (rows.length === 0) {
        return res.status(200).json({ cards: [] });
      }

      const { data, error } = await db
        .from("shuttle_highlights")
        .insert(rows)
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({
        cards: (data ?? []).map(toCard),
      });
    }

    res.setHeader("Allow", ["GET", "PUT"]);
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message ?? "Unknown server error",
    });
  }
}

