import type { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabaseAdmin";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const { data: dData, error: dErr } = await supabase.from("drivers").select("*");
    if (dErr) throw dErr;
    const drivers = (dData ?? []).map((d: any) => {
      const full = (d.full_name?.toString().trim()) || [d.first_name, d.last_name].filter(Boolean).join(" ").trim();
      const label = full || d.email || String(d.id).slice(0, 8);
      return { id: d.id, label };
    });

    const { data: vData, error: vErr } = await supabase.from("vehicles").select("*");
    if (vErr) throw vErr;
    const vehicles = (vData ?? []).map((v: any) => {
      const reg = v.regno || v.registration || v.reg_no || v.license_plate || "";
      const mmv = [v.make, v.model, v.variant].filter(Boolean).join(" ").trim();
      const label = (v.name?.toString().trim()) || mmv || reg || String(v.id).slice(0, 8);
      return { id: v.id, label, reg: reg || null, seats: v.seats ?? null };
    });

    res.status(200).json({ ok: true, drivers, vehicles });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message ?? String(err) });
  }
}
