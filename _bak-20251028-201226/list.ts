// src/pages/api/schedule/list.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ ok: false, error: "from/to krävs" });

    const [dRes, vRes, sRes] = await Promise.all([
      supabaseAdmin.from("drivers").select("id, display_name, name, full_name, first_name, last_name, email, phone"),
      supabaseAdmin.from("vehicles").select("id, label, regno, reg_no, registration, license_plate, make, model, variant"),
      supabaseAdmin
        .from("schedule")
        .select("*")
        .gte("start_date", String(from))
        .lte("end_date", String(to))
        .order("start_date", { ascending: true })
        .limit(500),
    ]);

    if (dRes.error) throw dRes.error;
    if (vRes.error) throw vRes.error;
    if (sRes.error) throw sRes.error;

    const dMap = new Map<string, string>();
    for (const r of dRes.data || []) {
      const name =
        r.display_name ??
        r.name ??
        r.full_name ??
        (([r.first_name, r.last_name].filter(Boolean).join(" ").trim() ||
          r.email ||
          String(r.id).slice(0, 8)) as string);
      dMap.set(String(r.id), name);
    }

    const vMap = new Map<string, string>();
    for (const r of vRes.data || []) {
      const reg: string | null =
        (r as any).regno ?? (r as any).reg_no ?? (r as any).registration ?? (r as any).license_plate ?? null;
      const label =
        (r as any).label ??
        ([ (r as any).make, (r as any).model, (r as any).variant ]
          .filter(Boolean)
          .join(" ") ||
          (reg ? `Fordon ${reg}` : `Fordon ${String(r.id).slice(0, 8)}`));
      vMap.set(String(r.id), label);
    }

    const rows = (sRes.data || []).map((r: any) => ({
      ...r,
      driver_name: r.driver_id ? dMap.get(String(r.driver_id)) ?? "" : "",
      vehicle_label: r.vehicle_id ? vMap.get(String(r.vehicle_id)) ?? "" : "",
    }));

    return res.status(200).json({ ok: true, data: rows });
  } catch (err: any) {
    console.error("/api/schedule/list error:", err);
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
}
