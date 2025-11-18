// src/pages/api/vehicles/options.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";




type VehicleRow = {
  id: string;
  reg_no: string | null;   // anpassa om din kolumn heter t.ex. regnr/regno
  name: string | null;
  call_sign: string | null;
  // seats/capacity etc kan lÃ¤ggas till vid behov
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const search = (req.query.search as string | undefined)?.trim() || "";

    let q = supabaseAdmin
      .from("vehicles") // byt tabellnamn hÃ¤r om din flotta heter nÃ¥got annat
      .select("id, reg_no, name, call_sign")
      .order("reg_no", { ascending: true })
      .limit(100);

    if (search) {
      q = q.or(
        [
          `reg_no.ilike.%${search}%`,
          `name.ilike.%${search}%`,
          `call_sign.ilike.%${search}%`,
        ].join(",")
      );
    }

    const { data, error } = await q;
    if (error) throw error;

    const options = (data as VehicleRow[] | null | undefined)?.map((v) => {
      const parts = [v.name, v.reg_no, v.call_sign].filter(Boolean);
      return { id: v.id, label: (parts[0] || "Fordon") + (parts[1] ? ` â€“ ${parts[1]}` : "") };
    }) ?? [];

    return res.status(200).json({ options });
  } catch (e: any) {
    console.error("/api/vehicles/options error:", e?.message || e);
    return res.status(200).json({ options: [] });
  }
}

