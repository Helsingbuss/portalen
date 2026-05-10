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

    const code = String(req.body?.code || "").trim().toUpperCase();
    const tripId = req.body?.trip_id || null;
    const subtotal = Number(req.body?.subtotal || 0);

    if (!code) {
      return res.status(400).json({
        ok: false,
        error: "Rabattkod saknas.",
      });
    }

    if (subtotal <= 0) {
      return res.status(400).json({
        ok: false,
        error: "Belopp saknas.",
      });
    }

    const { data: campaign, error } = await supabase
      .from("sundra_campaigns")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (error) throw error;

    if (!campaign) {
      return res.status(404).json({
        ok: false,
        error: "Rabattkoden finns inte.",
      });
    }

    if (campaign.status !== "active") {
      return res.status(400).json({
        ok: false,
        error: "Rabattkoden är inte aktiv.",
      });
    }

    const now = new Date();

    if (campaign.starts_at && new Date(campaign.starts_at) > now) {
      return res.status(400).json({
        ok: false,
        error: "Rabattkoden gäller inte ännu.",
      });
    }

    if (campaign.ends_at && new Date(campaign.ends_at) < now) {
      return res.status(400).json({
        ok: false,
        error: "Rabattkoden har gått ut.",
      });
    }

    if (
      campaign.max_uses !== null &&
      campaign.max_uses !== undefined &&
      Number(campaign.used_count || 0) >= Number(campaign.max_uses)
    ) {
      return res.status(400).json({
        ok: false,
        error: "Rabattkoden har använts max antal gånger.",
      });
    }

    if (campaign.applies_to === "trip" && campaign.trip_id !== tripId) {
      return res.status(400).json({
        ok: false,
        error: "Rabattkoden gäller inte för denna resa.",
      });
    }

    let discountAmount = 0;

    if (campaign.discount_type === "fixed") {
      discountAmount = Number(campaign.discount_value || 0);
    } else {
      discountAmount = subtotal * (Number(campaign.discount_value || 0) / 100);
    }

    discountAmount = Math.min(Math.round(discountAmount), subtotal);
    const totalAfterDiscount = Math.max(0, subtotal - discountAmount);

    return res.status(200).json({
      ok: true,
      campaign: {
        id: campaign.id,
        code: campaign.code,
        name: campaign.name,
        discount_type: campaign.discount_type,
        discount_value: campaign.discount_value,
      },
      subtotal,
      discount_amount: discountAmount,
      total_after_discount: totalAfterDiscount,
      message: `Rabattkod ${campaign.code} aktiverad.`,
    });
  } catch (e: any) {
    console.error("/api/public/sundra/campaigns/validate error:", e);

    return res.status(500).json({
      ok: false,
      error: e?.message || "Kunde inte kontrollera rabattkod.",
    });
  }
}
