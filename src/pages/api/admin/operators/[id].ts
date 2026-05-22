import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";

const supabase = createClient(supabaseUrl, serviceKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = String(req.query.id ?? "").trim();
  if (!id) return res.status(400).json({ error: "id saknas" });

  try {
    if (req.method === "PUT") {
      const patch = req.body ?? {};
      const update = {
        name: patch.name ?? undefined,
        short_name: patch.short_name ?? undefined,
        contact_name: patch.contact_name ?? undefined,
        contact_email: patch.contact_email ?? undefined,
        contact_phone: patch.contact_phone ?? undefined,
        website: patch.website ?? undefined,
        logo_url: patch.logo_url ?? undefined,
        notes: patch.notes ?? undefined,
        is_active: typeof patch.is_active === "boolean" ? patch.is_active : undefined,
      };

      const { data, error } = await supabase
        .from("operators")
        .update(update)
        .eq("id", id)
        .select("*")
        .single();

      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json({ operator: data });
    }

    if (req.method === "DELETE") {
      const { error } = await supabase.from("operators").delete().eq("id", id);
      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "PUT,DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
}
