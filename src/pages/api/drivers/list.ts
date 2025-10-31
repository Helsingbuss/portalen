import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Säker hantering av query-parametrar
    const q = (req?.query as any)?.search ? String((req.query as any).search) : "";
    const page = Number((req?.query as any)?.page ?? 1) || 1;
    const pageSize = Number((req?.query as any)?.pageSize ?? 20) || 20;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabaseAdmin
      .from("drivers")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (q) {
      // justera kolumner här om ditt sök ska ligga på annan kolumn
      query = query.ilike("name", `%${q}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return res.status(200).json({ data: data ?? [], count: count ?? 0, page, pageSize });
  } catch (e: any) {
    console.error("/api/drivers/list error:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Serverfel" });
  }
}
