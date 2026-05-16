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
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("shuttle_tickets")
        .select(`
          *,
          shuttle_departures (
            id,
            departure_date,
            departure_time
          ),
          shuttle_routes (
            id,
            name,
            route_code
          ),
          shuttle_passengers (
            id,
            customer_name,
            customer_email
          )
        `)
        .order("created_at", {
          ascending: false,
        });

      if (error) throw error;

      return res.status(200).json({
        ok: true,
        tickets: data || [],
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  } catch (e: any) {
    console.error(e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Serverfel",
    });
  }
}
