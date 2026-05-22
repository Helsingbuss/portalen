import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdminApi } from "@/lib/adminApi";

function makeReference(prefix = "PAY") {
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${Date.now()}-${random}`;
}

function getCurrency() {
  return (
    process.env.SUMUP_CURRENCY ||
    process.env.NEXT_PUBLIC_STRIPE_CURRENCY ||
    "SEK"
  ).toUpperCase();
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

  const sumupApiKey = process.env.SUMUP_API_KEY;
  const merchantCode = process.env.SUMUP_MERCHANT_CODE;

  if (!sumupApiKey || !merchantCode) {
    res.status(500).json({
      ok: false,
      error: "SUMUP_API_KEY eller SUMUP_MERCHANT_CODE saknas i portalen.",
    });
    return;
  }

  const {
    amount,
    title,
    customerName,
    customerEmail,
    customerPhone,
    reference,
    sourceType,
    sourceId,
  } = req.body || {};

  const numberAmount = Number(amount);

  if (!Number.isFinite(numberAmount) || numberAmount <= 0) {
    res.status(400).json({ ok: false, error: "Belopp saknas eller är fel." });
    return;
  }

  if (!title || !customerName) {
    res.status(400).json({ ok: false, error: "Titel eller kundnamn saknas." });
    return;
  }

  const checkoutReference = reference || makeReference("HB-PAY");
  const currency = getCurrency();

  const { data: order, error: insertError } = await supabaseAdmin
    .from("app_store_orders")
    .insert({
      order_reference: checkoutReference,
      source_type: sourceType || null,
      source_id: sourceId || null,
      product_id: sourceType || "custom",
      title,
      customer_name: customerName,
      customer_email: customerEmail || null,
      customer_phone: customerPhone || null,
      quantity: 1,
      amount: numberAmount,
      currency,
      status: "pending",
      sumup_checkout_reference: checkoutReference,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (insertError) {
    res.status(500).json({ ok: false, error: insertError.message });
    return;
  }

  const sumupResponse = await fetch("https://api.sumup.com/v0.1/checkouts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sumupApiKey}`,
      Accept: "application/problem+json, application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      checkout_reference: checkoutReference,
      amount: numberAmount,
      currency,
      merchant_code: merchantCode,
      description: title,
      hosted_checkout: {
        enabled: true,
      },
    }),
  });

  const sumupText = await sumupResponse.text();

  let sumupData: any = {};
  try {
    sumupData = sumupText ? JSON.parse(sumupText) : {};
  } catch {
    sumupData = { raw: sumupText };
  }

  if (!sumupResponse.ok) {
    await supabaseAdmin
      .from("app_store_orders")
      .update({
        status: "failed",
        sumup_status: "failed",
        sumup_raw: sumupData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    res.status(sumupResponse.status).json({
      ok: false,
      error:
        sumupData?.detail ||
        sumupData?.title ||
        "SumUp kunde inte skapa betalningslänken.",
      sumup: sumupData,
    });
    return;
  }

  const paymentUrl = sumupData.hosted_checkout_url;

  if (!paymentUrl) {
    await supabaseAdmin
      .from("app_store_orders")
      .update({
        status: "failed",
        sumup_checkout_id: sumupData.id || null,
        sumup_status: sumupData.status || "missing_url",
        sumup_raw: sumupData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    res.status(500).json({
      ok: false,
      error: "SumUp skapade checkout men ingen hosted_checkout_url kom tillbaka.",
      sumup: sumupData,
    });
    return;
  }

  await supabaseAdmin
    .from("app_store_orders")
    .update({
      status: "pending",
      sumup_checkout_id: sumupData.id || null,
      sumup_checkout_reference: checkoutReference,
      sumup_payment_url: paymentUrl,
      sumup_status: sumupData.status || "PENDING",
      sumup_raw: sumupData,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);

  res.status(200).json({
    ok: true,
    paymentUrl,
    paymentId: sumupData.id,
    reference: checkoutReference,
    status: sumupData.status || "PENDING",
  });
}
