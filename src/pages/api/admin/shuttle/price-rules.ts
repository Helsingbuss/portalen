import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, serviceRoleKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ ok: false, message: "Supabase env saknas." });
  }

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("shuttle_price_rules")
      .select("id,valid_from,valid_to,line_code,from_stop_name,to_stop_name,passenger_type_key,ticket_type_key,price_sek,is_active,updated_at")
      .order("line_code", { ascending: true })
      .order("from_stop_name", { ascending: true });

    if (error) return res.status(500).json({ ok: false, message: error.message });

    return res.status(200).json({ ok: true, prices: data || [] });
  }

  if (req.method === "POST") {
    const row = {
      valid_from: String(req.body?.valid_from || "1900-01-01").trim(),
      valid_to: String(req.body?.valid_to || "2099-12-31").trim(),
      line_code: String(req.body?.line_code || "").trim(),
      from_stop_name: String(req.body?.from_stop_name || "").trim(),
      to_stop_name: String(req.body?.to_stop_name || "").trim(),
      passenger_type_key: String(req.body?.passenger_type_key || "").trim(),
      ticket_type_key: String(req.body?.ticket_type_key || "").trim(),
      price_sek: Number(req.body?.price_sek || 0),
      is_active: req.body?.is_active !== false,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("shuttle_price_rules")
      .upsert(row, {
        onConflict: "valid_from,valid_to,line_code,from_stop_name,to_stop_name,passenger_type_key,ticket_type_key",
      })
      .select("id,valid_from,valid_to,line_code,from_stop_name,to_stop_name,passenger_type_key,ticket_type_key,price_sek,is_active,updated_at")
      .single();

    if (error) return res.status(500).json({ ok: false, message: error.message });

    return res.status(200).json({ ok: true, message: "Pris sparat.", price: data });
  }

  if (req.method === "DELETE") {
    const id = String(req.query.id || "");
    if (!id) return res.status(400).json({ ok: false, message: "ID saknas." });

    const { error } = await supabase.from("shuttle_price_rules").delete().eq("id", id);

    if (error) return res.status(500).json({ ok: false, message: error.message });

    return res.status(200).json({ ok: true, message: "Pris borttaget." });
  }

  return res.status(405).json({ ok: false, message: "Metoden stöds inte." });
}

