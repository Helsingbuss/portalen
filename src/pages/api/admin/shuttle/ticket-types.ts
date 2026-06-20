import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, serviceRoleKey);

const fallbackTicketTypes = [
  {
    type_key: "plus",
    title: "Plus",
    benefits: [
      "Extra benutrymme",
      "Prioriterad ombordstigning",
      "1 handbagage + 1 resväska",
    ],
    sort_order: 1,
    is_active: true,
  },
  {
    type_key: "economy",
    title: "Ekonomi",
    benefits: [
      "Bekväm sittplats",
      "1 handbagage + 1 resväska",
    ],
    sort_order: 2,
    is_active: true,
  },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({
      ok: false,
      message: "Supabase env saknas.",
    });
  }

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("shuttle_ticket_types")
      .select("id,type_key,title,benefits,sort_order,is_active,updated_at")
      .order("sort_order", { ascending: true });

    if (error) {
      return res.status(500).json({
        ok: false,
        message: error.message,
        ticketTypes: fallbackTicketTypes,
      });
    }

    return res.status(200).json({
      ok: true,
      ticketTypes: data && data.length > 0 ? data : fallbackTicketTypes,
    });
  }

  if (req.method === "PUT") {
    const ticketTypes = Array.isArray(req.body?.ticketTypes)
      ? req.body.ticketTypes
      : [];

    if (ticketTypes.length === 0) {
      return res.status(400).json({
        ok: false,
        message: "Inga biljettyper skickades.",
      });
    }

    const rows = ticketTypes.map((item: any, index: number) => ({
      type_key: String(item.type_key || "").trim(),
      title: String(item.title || "").trim(),
      benefits: Array.isArray(item.benefits)
        ? item.benefits.map((text: any) => String(text).trim()).filter(Boolean)
        : [],
      sort_order: Number(item.sort_order || index + 1),
      is_active: item.is_active !== false,
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from("shuttle_ticket_types")
      .upsert(rows, { onConflict: "type_key" })
      .select("id,type_key,title,benefits,sort_order,is_active,updated_at")
      .order("sort_order", { ascending: true });

    if (error) {
      return res.status(500).json({
        ok: false,
        message: error.message,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Biljettyperna sparades.",
      ticketTypes: data,
    });
  }

  return res.status(405).json({
    ok: false,
    message: "Metoden stöds inte.",
  });
}
