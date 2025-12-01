// src/pages/api/ticket-types/delete.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

type Body = { id?: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });
  }

  const b = (req.body || {}) as Body;
  if (!b.id) {
    return res
      .status(400)
      .json({ ok: false, error: "Saknar id." });
  }

  try {
    const { error } = await supabase
      .from("ticket_types")
      .delete()
      .eq("id", b.id);

    if (error) {
      // t.ex. FK-fel om den används i departure_ticket_prices
      if (
        typeof error.message === "string" &&
        /foreign key/i.test(error.message)
      ) {
        return res.status(400).json({
          ok: false,
          error:
            "Biljetttypen används i prissättning eller bokningar och kan inte tas bort.",
        });
      }

      throw error;
    }

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error("/api/ticket-types/delete error:", e);
    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte ta bort biljetttyp.",
    });
  }
}
