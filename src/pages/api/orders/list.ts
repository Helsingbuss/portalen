import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { page = 1, pageSize = 10 } = req.query;

  const from = (Number(page) - 1) * Number(pageSize);
  const to = from + Number(pageSize) - 1;

  const { data, count, error } = await supabase
    .from("orders")
    .select("*", { count: "exact" })
    .range(from, to)
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json({
    rows: data,
    total: count,
  });
}
