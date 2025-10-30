import type { NextApiRequest, NextApiResponse } from "next";
import db from "@/lib/supabaseAdmin";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const { data: dData, error: dErr } = await db.from("drivers").select("*");
    if (dErr) throw dErr;

    const drivers = (dData ?? []).map((d: any) => {
      const full = (d.display_name?.trim())
        || (d.name?.trim())
        || (d.full_name?.trim())
        || [d.first_name, d.last_name].filter(Boolean).join(" ").trim();
      const label = full || d.email || String(d.id).slice(0, 8);
      return { id: d.id, label };
    });

    const { data: vData, error: vErr } = await db.from("vehicles").select("*");
    if (vErr) throw vErr;

    const vehicles = (vData ?? []).map((v: any) => {
      const reg = v.regno || v.reg_no || v.registration || v.license_plate || "";
      const mmv = [v.make, v.model, v.variant].filter(Boolean).join(" ").trim();
      const label = (v.label?.trim()) || (v.name?.trim()) || mmv || reg || String(v.id).slice(0, 8);
      return { id: v.id, label, reg: reg || null, seats: v.seats ?? null };
    });

    res.status(200).json({ ok: true, drivers, vehicles });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message ?? String(err) });
  }
}


