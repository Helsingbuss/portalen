import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const p = req.body ?? {};
    const insertObj = {
      first_name: p.first_name ?? null,
      last_name: p.last_name ?? null,
      email: p.email ?? null,
      phone: p.phone ?? null,
      national_id: p.national_id ?? null,
      role: p.role ?? null,
      department: p.department ?? null,
      employment_type: p.employment_type ?? null,
      hired_at: p.hired_at ?? null,
      note: p.note ?? null,
      active: typeof p.active === "boolean" ? p.active : true,
      avatar_url: p.avatar_url ?? null,
    };

    const { data, error } = await supabaseAdmin
      .from("employees")
      .insert(insertObj)
      .select("id")
      .single();

    if (error) throw error;

    return res.status(200).json({ ok: true, id: data?.id });
  } catch (e: any) {
    console.error("/api/employees/create error:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Serverfel" });
  }
}


