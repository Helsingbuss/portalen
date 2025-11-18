// src/pages/api/drivers/options.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";




type DriverRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  active: boolean | null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const search = (req.query.search as string | undefined)?.trim() || "";

    let q = supabaseAdmin
      .from("drivers")
      .select("id, first_name, last_name, email, phone, active")
      .eq("active", true) // visa bara aktiva i rullistan
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true })
      .limit(100);

    if (search) {
      q = q.or(
        [
          `first_name.ilike.%${search}%`,
          `last_name.ilike.%${search}%`,
          `email.ilike.%${search}%`,
          `phone.ilike.%${search}%`,
        ].join(",")
      );
    }

    const { data, error } = await q;
    if (error) throw error;

    const options = (data as DriverRow[] | null | undefined)?.map((d) => ({
      id: d.id,
      label: [d.first_name, d.last_name].filter(Boolean).join(" ").trim() || d.email || "ChauffÃ¶r",
      email: d.email ?? null,
      phone: d.phone ?? null,
      active: !!d.active,
    })) ?? [];

    return res.status(200).json({ options });
  } catch (e: any) {
    console.error("/api/drivers/options error:", e?.message || e);
    // Skicka tom lista hellre Ã¤n 500 sÃ¥ UI inte bryts
    return res.status(200).json({ options: [] });
  }
}

