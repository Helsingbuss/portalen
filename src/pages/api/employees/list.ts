// src/pages/api/employees/list.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabaseAdmin";




export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 10)));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const base = supabase.from("employees").select("*", { count: "exact" });

    const { data, error, count } = await base
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    return res.status(200).json({
      ok: true,
      rows: data ?? [],
      total: count ?? 0,
      page,
      pageSize,
    });
  } catch (e: any) {
    console.error("/api/employees/list error:", e?.message || e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}



