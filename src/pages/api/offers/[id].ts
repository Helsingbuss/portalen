// src/pages/api/offers/[id].ts
import type {
  NextApiRequest as NextApiRequestT,
  NextApiResponse as NextApiResponseT,
} from "next";
import { supabase as sbClient } from "@/lib/supabaseClient";

export default async function handler(
  req: NextApiRequestT,
  res: NextApiResponseT
) {
  const { id } = req.query as { id?: string };

  if (!id) {
    return res.status(400).json({ error: "Missing id" });
  }

  try {
    const { data, error } = await sbClient
      .from("offers")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ offer: data });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Unknown error" });
  }
}
