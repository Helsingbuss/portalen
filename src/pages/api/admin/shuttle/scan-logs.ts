import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
      });
    }

    const { data, error } = await supabaseAdmin
      .from("shuttle_scan_logs")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(300);

    if (error) {
      throw error;
    }

    return res.status(200).json({
      ok: true,
      logs: data || [],
    });
  } catch (e: any) {
    console.error("/api/admin/shuttle/scan-logs error:", e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte hämta scannerhistorik.",
    });
  }
}
