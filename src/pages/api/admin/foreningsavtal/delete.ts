// src/pages/api/admin/foreningsavtal/delete.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const TABLE_NAME = "association_agreements"; // ÄNDRA om din tabell heter något annat

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const id = body.id as string | undefined;

    if (!id) {
      return res.status(400).json({ error: "Saknar id för avtalet." });
    }

    const { error } = await supabaseAdmin
      .from(TABLE_NAME)
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[foreningsavtal/delete] Supabase-fel:", error);
      return res.status(500).json({
        error: "Kunde inte ta bort avtalet i databasen.",
        supabaseError: error.message,
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error("[foreningsavtal/delete] Fatal error:", err);
    return res.status(500).json({ error: "Internt fel i delete-API:t." });
  }
}
