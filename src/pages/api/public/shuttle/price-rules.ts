import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, serviceRoleKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const lineCode = String(req.query.line || "").trim();
  const from = String(req.query.from || "").trim();
  const to = String(req.query.to || "").trim();
  const date = String(req.query.date || "").trim();

  let query = supabase
    .from("shuttle_price_rules")
    .select("valid_from,valid_to,line_code,from_stop_name,to_stop_name,passenger_type_key,ticket_type_key,price_sek")
    .eq("is_active", true);

  if (lineCode) query = query.eq("line_code", lineCode);
  if (from) query = query.eq("from_stop_name", from);
  if (to) query = query.eq("to_stop_name", to);

  if (date) {
    query = query.lte("valid_from", date).gte("valid_to", date);
  }

  const { data, error } = await query
    .order("valid_from", { ascending: false })
    .order("price_sek", { ascending: true });

  if (error) return res.status(500).json({ ok: false, message: error.message });

  return res.status(200).json({ ok: true, prices: data || [] });
}
