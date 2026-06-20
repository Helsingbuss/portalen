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
  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      message: "Metoden stöds inte.",
    });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(200).json({
      ok: true,
      ticketTypes: fallbackTicketTypes,
    });
  }

  const { data, error } = await supabase
    .from("shuttle_ticket_types")
    .select("type_key,title,benefits,sort_order,is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return res.status(200).json({
      ok: true,
      ticketTypes: fallbackTicketTypes,
    });
  }

  return res.status(200).json({
    ok: true,
    ticketTypes: data && data.length > 0 ? data : fallbackTicketTypes,
  });
}
