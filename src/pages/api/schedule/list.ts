import type { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/supabaseAdmin";




export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const from = String(req.query.from ?? "").slice(0, 10);
    const to = String(req.query.to ?? "").slice(0, 10);

    const [dRes, vRes, sRes] = await Promise.all([
      db.from("drivers").select("*"),
      db.from("vehicles").select("*"),
      db.from("schedule")
        .select("*")
        .gte("start_date", from || "0001-01-01")
        .lte("end_date", to || "9999-12-31")
        .order("start_date", { ascending: true }),
    ]);

    if (dRes.error) throw dRes.error;
    if (vRes.error) throw vRes.error;
    if (sRes.error) throw sRes.error;

    const dIx = new Map((dRes.data || []).map((d: any) => {
      const full = (d.display_name?.trim())
        || (d.name?.trim())
        || (d.full_name?.trim())
        || [d.first_name, d.last_name].filter(Boolean).join(" ").trim()
        || d.email || String(d.id).slice(0, 8);
      return [d.id, { id: d.id, label: full }];
    }));

    const vIx = new Map((vRes.data || []).map((v: any) => {
      const reg = v.regno || v.reg_no || v.registration || v.license_plate || "";
      const mmv = [v.make, v.model, v.variant].filter(Boolean).join(" ").trim();
      const label = (v.label?.trim()) || (v.name?.trim()) || mmv || reg || String(v.id).slice(0, 8);
      return [v.id, { id: v.id, label, reg }];
    }));

    const items = (sRes.data || []).map((row: any) => ({
      ...row,
      driver: row.driver_id ? (dIx.get(row.driver_id) ?? null) : null,
      vehicle: row.vehicle_id ? (vIx.get(row.vehicle_id) ?? null) : null,
    }));

    res.status(200).json({ ok: true, items });
  } catch (e: any) {
    console.error("/api/schedule/list error:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
}



