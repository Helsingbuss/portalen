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
    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: "Method not allowed",
      });
    }

    const body = req.body || {};

    console.log("PRISLISTOR BODY:", body);

    // FLEXIBEL INPUT
    let rows: any[] = [];

    if (Array.isArray(body)) {
      rows = body;
    } else if (Array.isArray(body.rows)) {
      rows = body.rows;
    } else if (Array.isArray(body.prices)) {
      rows = body.prices;
    } else if (Array.isArray(body.data)) {
      rows = body.data;
    } else if (typeof body === "object") {
      rows = [body];
    }

    if (!rows.length) {
      return res.status(400).json({
        ok: false,
        error:
          "Ingen data skickades till prislistor.",
      });
    }

    const payload = rows.map((row: any) => ({
      ...row,
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from("pricing_rules")
      .upsert(payload, {
        onConflict: "id",
      })
      .select();

    if (error) {
      throw error;
    }

    return res.status(200).json({
      ok: true,
      rows: data || [],
    });
  } catch (e: any) {
    console.error(
      "/api/admin/prislistor/save error:",
      e
    );

    return res.status(500).json({
      ok: false,
      error:
        e?.message ||
        "Kunde inte spara prislistor.",
    });
  }
}
