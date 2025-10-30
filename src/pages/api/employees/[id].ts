import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id?: string };
  if (!id) return res.status(400).json({ error: "Saknar id" });

  try {
    if (req.method === "GET") {
      const { data, error } = await supabaseAdmin
        .from("employees")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return res.status(200).json({ ok: true, employee: data });
    }

    if (req.method === "PATCH") {
      const p = req.body ?? {};
      const update: Record<string, any> = {
        first_name: p.first_name ?? undefined,
        last_name: p.last_name ?? undefined,
        email: p.email ?? undefined,
        phone: p.phone ?? undefined,
        national_id: p.national_id ?? undefined,
        role: p.role ?? undefined,
        department: p.department ?? undefined,
        employment_type: p.employment_type ?? undefined,
        hired_at: p.hired_at ?? undefined,
        terminated_at: p.terminated_at ?? undefined,
        note: p.note ?? undefined,
        active: typeof p.active === "boolean" ? p.active : undefined,
        avatar_url: p.avatar_url ?? undefined,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabaseAdmin
        .from("employees")
        .update(update)
        .eq("id", id)
        .select("id")
        .single();
      if (error) throw error;

      return res.status(200).json({ ok: true, id: data?.id });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e: any) {
    console.error("/api/employees/[id] error:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Serverfel" });
  }
}
