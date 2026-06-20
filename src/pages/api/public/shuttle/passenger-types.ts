import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, serviceRoleKey);

const fallbackPassengerTypes = [
  { type_key: "adult", title: "Vuxen", age_text: "26-64 år", sort_order: 1, is_active: true },
  { type_key: "child", title: "Barn", age_text: "0-15 år", sort_order: 2, is_active: true },
  { type_key: "youth", title: "Ungdom", age_text: "16-25 år", sort_order: 3, is_active: true },
  { type_key: "senior", title: "Senior", age_text: "65+ år", sort_order: 4, is_active: true },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { data, error } = await supabase
    .from("shuttle_passenger_types")
    .select("type_key,title,age_text,sort_order,is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) return res.status(200).json({ ok: true, passengerTypes: fallbackPassengerTypes });

  return res.status(200).json({ ok: true, passengerTypes: data && data.length > 0 ? data : fallbackPassengerTypes });
}
