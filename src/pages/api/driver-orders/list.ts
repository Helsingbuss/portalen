import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";



const supabase = (admin as any).supabaseAdmin || (admin as any).supabase || (admin as any).default;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const pageSize = Math.min(50, Math.max(5, parseInt(String(req.query.pageSize ?? "10"), 10) || 10));
    const status = (req.query.status as string | undefined)?.toLowerCase() || ""; // draft|sent|ack|done|""
    const search = (req.query.search as string | undefined)?.trim() || "";

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let q = supabase
      .from("driver_orders")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (status) q = q.eq("status", status);
    if (search) {
      q = q.or(
        [
          `order_number.ilike.%${search}%`,
          `driver_name.ilike.%${search}%`,
          `driver_email.ilike.%${search}%`,
          `vehicle_reg.ilike.%${search}%`,
          `out_from.ilike.%${search}%`,
          `out_to.ilike.%${search}%`,
        ].join(",")
      );
    }

    const { data, error, count } = await q.range(from, to);
    if (error) throw error;

    return res.status(200).json({ rows: data ?? [], page, pageSize, total: count ?? 0 });
  } catch (e: any) {
    console.error("/api/driver-orders/list error:", e?.message || e);
    return res.status(500).json({ error: "Kunde inte hÃ¤mta kÃ¶rordrar" });
  }
}

