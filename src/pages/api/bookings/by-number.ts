// src/pages/api/bookings/by-number.ts
import type { NextApiRequest, NextApiResponse } from "next";
import supabase from "@/lib/supabaseAdmin";

export const config = { runtime: "nodejs" };

type ApiOk = { ok: true; booking: any };
type ApiErr = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiOk | ApiErr>
) {
  // Tillåt preflight om något anropar med OPTIONS
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "GET,OPTIONS");
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET,OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Stöd både ?no=BK25XXXX och ?number=... som input
    const no =
      (typeof req.query.no === "string" && req.query.no.trim()) ||
      (typeof req.query.number === "string" && req.query.number.trim()) ||
      (typeof req.query.id === "string" && req.query.id.trim()) ||
      "";

    if (!no) return res.status(400).json({ error: "Saknar parameter 'no' (booking number)" });

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("booking_number", no)
      .single();

    if (error) {
      // 406/425 etc -> behandla som ej hittad om det är "No rows"
      if ((error as any).code === "PGRST116" /* No rows */) {
        return res.status(404).json({ error: "Hittar ingen bokning med detta nummer" });
      }
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: "Hittar ingen bokning med detta nummer" });
    }

    return res.status(200).json({ ok: true, booking: data });
  } catch (e: any) {
    console.error("[bookings/by-number] error:", e?.message || e);
    return res.status(500).json({ error: e?.message || "Serverfel" });
  }
}
