import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { data, error } = await supabase
      .from("sundra_booking_passengers")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    return res.status(200).json({
      ok: true,
      passengers: data || [],
    });
  } catch (e: any) {
    console.error(e);

    return res.status(500).json({
      ok: false,
      error:
        e?.message ||
        "Kunde inte hämta passagerare.",
    });
  }
}
