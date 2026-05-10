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

    const prices =
      req.body?.prices;

    if (
      !prices ||
      typeof prices !==
        "object"
    ) {
      return res.status(400).json({
        ok: false,
        error:
          "prices saknas eller har fel format.",
      });
    }

    const {
      data,
      error,
    } = await supabase
      .from("prislistor")
      .upsert(
        {
          name: "main",
          prices,
          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            "name",
        }
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.status(200).json({
      ok: true,
      prices:
        data?.prices ||
        null,
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
