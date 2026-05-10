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

    const refund_id =
      req.body?.refund_id;

    if (!refund_id) {
      return res.status(400).json({
        ok: false,
        error: "refund_id saknas.",
      });
    }

    const {
      data,
      error,
    } = await supabase
      .from("sundra_refunds")
      .update({
        status: "refunded",
        refunded_at:
          new Date().toISOString(),
      })
      .eq("id", refund_id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.status(200).json({
      ok: true,
      refund: data,
    });
  } catch (e: any) {
    console.error(
      "/api/admin/sundra/refunds/mark-refunded error:",
      e
    );

    return res.status(500).json({
      ok: false,
      error:
        e?.message ||
        "Kunde inte markera återbetalning.",
    });
  }
}
