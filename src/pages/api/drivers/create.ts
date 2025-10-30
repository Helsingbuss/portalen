// src/pages/api/drivers/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const p = req.body ?? {};

    // TillÃ¥t tomma fÃ¤lt -> null i DB
    const toNull = (v: any) => (v === "" || v === undefined ? null : v);

    const insert = {
      first_name: toNull(p.first_name),
      last_name: toNull(p.last_name),
      phone: toNull(p.phone),
      email: toNull(p.email),
      license_classes: Array.isArray(p.license_classes)
        ? p.license_classes
        : typeof p.license_classes === "string" && p.license_classes.trim()
        ? p.license_classes.split(",").map((s: string) => s.trim())
        : [],
      employment_type: toNull(p.employment_type),         // "tim" | "hel"
      national_id: toNull(p.national_id),                 // personnummer
      hired_at: toNull(p.hired_at),                        // "YYYY-MM-DD"
      active: typeof p.active === "boolean" ? p.active : true,
      note: toNull(p.note),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("drivers")
      .insert(insert)
      .select("id")
      .single();

    if (error) throw error;

    return res.status(200).json({ ok: true, id: data?.id });
  } catch (e: any) {
    console.error("/api/drivers/create error:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Serverfel" });
  }
}


