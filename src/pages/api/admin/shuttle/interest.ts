import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/supabaseAdmin";

const db = requireAdmin();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { data, error } = await db
    .from("shuttle_interest_signups")
    .select("id,email,source,consent,status,created_at,updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Interest admin fetch error:", error);
    return res.status(500).json({ error: "Kunde inte hämta intresseanmälningar" });
  }

  return res.status(200).json({ signups: data || [] });
}
