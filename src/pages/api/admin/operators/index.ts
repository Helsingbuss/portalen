import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";

const supabase = createClient(supabaseUrl, serviceKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      const q = String(req.query.q ?? "").trim();
      const active = String(req.query.active ?? "").trim(); // "true"/"false"/""

      let query = supabase.from("operators").select("*").order("name", { ascending: true });

      if (active === "true") query = query.eq("is_active", true);
      if (active === "false") query = query.eq("is_active", false);

      if (q) {
        // Supabase or-filter
        const like = `%${q}%`;
        query = query.or(
          [
            `name.ilike.${like}`,
            `short_name.ilike.${like}`,
            `contact_name.ilike.${like}`,
            `contact_email.ilike.${like}`,
          ].join(",")
        );
      }

      const { data, error } = await query;
      if (error) return res.status(400).json({ error: error.message });

      return res.status(200).json({ operators: data ?? [] });
    }

    if (req.method === "POST") {
      const body = req.body ?? {};
      const name = String(body.name ?? "").trim();
      if (!name) return res.status(400).json({ error: "name krävs" });

      const insert = {
        name,
        short_name: body.short_name ?? null,
        contact_name: body.contact_name ?? null,
        contact_email: body.contact_email ?? null,
        contact_phone: body.contact_phone ?? null,
        website: body.website ?? null,
        logo_url: body.logo_url ?? null,
        notes: body.notes ?? null,
        is_active: typeof body.is_active === "boolean" ? body.is_active : true,
      };

      const { data, error } = await supabase.from("operators").insert(insert).select("*").single();
      if (error) return res.status(400).json({ error: error.message });

      return res.status(200).json({ operator: data });
    }

    res.setHeader("Allow", "GET,POST");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
}
