import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdminApi } from "@/lib/adminApi";

function makeReference(prefix = "RES") {
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${Date.now()}-${random}`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const auth = await requireAdminApi(req, res);
  if (!auth) return;

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Metoden stöds inte." });
    return;
  }

  const { supabaseAdmin, user } = auth;

  const {
    productId,
    title,
    customerName,
    customerEmail,
    customerPhone,
    quantity,
    amount,
    sourceType,
    sourceId,
  } = req.body || {};

  if (!customerName) {
    res.status(400).json({ ok: false, error: "Kundnamn saknas." });
    return;
  }

  const orderReference = makeReference("RES");

  const { data, error } = await supabaseAdmin
    .from("app_store_orders")
    .insert({
      order_reference: orderReference,
      source_type: sourceType || null,
      source_id: sourceId || null,
      product_id: productId || "custom",
      title: title || "Reservation",
      customer_name: customerName,
      customer_email: customerEmail || null,
      customer_phone: customerPhone || null,
      quantity: Number(quantity || 1),
      amount: Number(amount || 0),
      currency: "SEK",
      status: "reserved",
      created_by: user.id,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    res.status(500).json({ ok: false, error: error.message });
    return;
  }

  res.status(200).json({
    ok: true,
    reservationId: data.id,
    reference: data.order_reference,
  });
}
