import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdminApi } from "@/lib/adminApi";
import { sendBookingAdminEmail, sendBookingCustomerEmail } from "@/lib/sumup";

function makeReference(prefix = "HB-PAY") {
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${Date.now()}-${random}`;
}

function normalizeSwedishPhone(input: string) {
  const cleaned = String(input || "")
    .trim()
    .replace(/\s/g, "")
    .replace(/-/g, "");

  if (!cleaned) return "";
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("00")) return "+" + cleaned.slice(2);
  if (cleaned.startsWith("46")) return "+" + cleaned;
  if (cleaned.startsWith("0")) return "+46" + cleaned.slice(1);

  return cleaned;
}

function isTrue(value?: string) {
  return String(value || "").toLowerCase() === "true";
}

function shouldSend(value: any) {
  return value === true || String(value || "").toLowerCase() === "true" || String(value || "") === "1";
}

function toPassengerCount(value: any, fallback = 1) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function getCurrency() {
  return String(process.env.SUMUP_CURRENCY || "SEK").toUpperCase();
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireAdminApi(req, res);
  if (!auth) return;

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Metoden stöds inte." });
    return;
  }

  const { supabaseAdmin, user } = auth;

  const {
    amount,
    title,
    customerName,
    customerEmail,
    customerPhone,
    reference,
    message,
    sourceType,
    sourceId,
    sendEmail,
    businessUnit,
    productTitle,
    passengersCount,
    passengerNumber,
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

  const checkoutReference = reference
    ? `${String(reference).replace(/\s/g, "-")}-${Date.now()}`
    : makeReference();

  const currency = getCurrency();

  const { data: order, error: insertError } = await supabaseAdmin
    .from("app_store_orders")
    .insert({
      order_reference: checkoutReference,
      source_type: sourceType || "payment_link",
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
    res.status(500).json({ ok: false, step: "database", error: insertError.message });
    return;
  }

  let paymentUrl = "";
  let sumupData: any = {};
  const sumupDryrun = isTrue(process.env.SUMUP_DRYRUN);

  try {
    if (sumupDryrun) {
      paymentUrl = `https://checkout.sumup.com/pay/test-${checkoutReference}`;
      sumupData = {
        id: `dryrun-${checkoutReference}`,
        status: "DRYRUN",
        hosted_checkout_url: paymentUrl,
      };
    } else {
      const sumupApiKey = process.env.SUMUP_API_KEY;
      const merchantCode = process.env.SUMUP_MERCHANT_CODE;

      if (!sumupApiKey || !merchantCode) {
        throw new Error("SUMUP_API_KEY eller SUMUP_MERCHANT_CODE saknas i portalen.");
      }

      const sumupResponse = await fetchWithTimeout(
        "https://api.sumup.com/v0.1/checkouts",
        {
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
        },
        15000
      );

      const sumupText = await sumupResponse.text();

      try {
        sumupData = sumupText ? JSON.parse(sumupText) : {};
      } catch {
        sumupData = { raw: sumupText };
      }

      if (!sumupResponse.ok) {
        throw new Error(
          sumupData?.detail ||
            sumupData?.title ||
            sumupData?.message ||
            "SumUp kunde inte skapa betalningslänken."
        );
      }

      paymentUrl = sumupData.hosted_checkout_url;

      if (!paymentUrl) {
        throw new Error("SumUp skapade checkout men skickade ingen betalningslänk.");
      }
    }

    await supabaseAdmin
      .from("app_store_orders")
      .update({
        status: "pending",
        sumup_checkout_id: sumupData.id || null,
        sumup_payment_url: paymentUrl,
        sumup_status: sumupData.status || "PENDING",
        sumup_raw: sumupData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);
  } catch (error: any) {
    await supabaseAdmin
      .from("app_store_orders")
      .update({
        status: "failed",
        sumup_status: "failed",
        sumup_raw: sumupData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    res.status(500).json({
      ok: false,
      step: "sumup",
      error: error?.message || "Kunde inte skapa betalningslänken.",
    });
    return;
  }

  let smsResult: any = {
    sent: false,
    dryrun: false,
    localDryrun: false,
  };

  if (customerPhone) {
    const normalizedTo = normalizeSwedishPhone(customerPhone);
    const from = process.env.ELKS_FROM || "Helsingbuss";

    const baseMessage =
      message ||
      `Hej! Här är din betalningslänk från Helsingbuss.\nBelopp: ${numberAmount} kr.`;

    const finalSmsText = baseMessage.includes(paymentUrl)
      ? baseMessage
      : `${baseMessage}\n\nBetala här: ${paymentUrl}`;

    const { data: smsLog } = await supabaseAdmin
      .from("app_sms_logs")
      .insert({
        to_phone: normalizedTo,
        from_name: from,
        message: finalSmsText,
        customer_name: customerName || null,
        source_type: "payment_link",
        source_id: order.id,
        status: "pending",
        created_by: user.id,
      })
      .select("*")
      .single();

    try {
      if (!normalizedTo.startsWith("+")) {
        throw new Error("Telefonnummer måste vara i format +467...");
      }

      if (isTrue(process.env.ELKS_LOCAL_DRYRUN)) {
        smsResult = {
          sent: true,
          dryrun: true,
          localDryrun: true,
          message: "SMS simulerat lokalt.",
        };

        if (smsLog?.id) {
          await supabaseAdmin
            .from("app_sms_logs")
            .update({
              status: "local_dryrun",
              provider_status: "local_dryrun",
              updated_at: new Date().toISOString(),
            })
            .eq("id", smsLog.id);
        }
      } else {
        const username = process.env.ELKS_USERNAME;
        const password = process.env.ELKS_PASSWORD;

        if (!username || !password) {
          throw new Error("ELKS_USERNAME eller ELKS_PASSWORD saknas i portalen.");
        }

        const body = new URLSearchParams({
          from,
          to: normalizedTo,
          message: finalSmsText,
        });

        if (isTrue(process.env.ELKS_DRYRUN)) {
          body.set("dryrun", "yes");
        }

        const basicAuth = Buffer.from(`${username}:${password}`).toString("base64");

        const smsResponse = await fetchWithTimeout(
          "https://api.46elks.com/a1/sms",
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${basicAuth}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: body.toString(),
          },
          15000
        );

        const smsTextResponse = await smsResponse.text();

        let smsPayload: any = {};
        try {
          smsPayload = smsTextResponse ? JSON.parse(smsTextResponse) : {};
        } catch {
          smsPayload = { raw: smsTextResponse };
        }

        if (!smsResponse.ok) {
          throw new Error(
            smsPayload?.message ||
              smsPayload?.error ||
              smsPayload?.detail ||
              "46elks kunde inte skicka SMS."
          );
        }

        smsResult = {
          sent: true,
          dryrun: isTrue(process.env.ELKS_DRYRUN),
          localDryrun: false,
          providerMessageId: smsPayload?.id || null,
          providerStatus: smsPayload?.status || null,
        };

        if (smsLog?.id) {
          await supabaseAdmin
            .from("app_sms_logs")
            .update({
              status: isTrue(process.env.ELKS_DRYRUN) ? "dryrun" : "sent",
              provider_message_id: smsPayload?.id || null,
              provider_status: smsPayload?.status || null,
              provider_raw: smsPayload,
              updated_at: new Date().toISOString(),
            })
            .eq("id", smsLog.id);
        }
      }
    } catch (error: any) {
      smsResult = {
        sent: false,
        error: error?.message || "SMS kunde inte skickas.",
      };

      if (smsLog?.id) {
        await supabaseAdmin
          .from("app_sms_logs")
          .update({
            status: "failed",
            error_message: smsResult.error,
            updated_at: new Date().toISOString(),
          })
          .eq("id", smsLog.id);
      }
    }
  }

  let emailResult: any = {
    customerSent: false,
    adminSent: false,
    skipped: true,
    error: null,
  };

  const isSundraPayment =
    businessUnit === "sundra" ||
    sourceType === "agent_sundra_booking" ||
    sourceType === "sundra_booking" ||
    sourceType === "trip_ticket";

  if (isSundraPayment && shouldSend(sendEmail) && customerEmail) {
    try {
      const emailTripTitle = String(productTitle || title || "Sundra resa");
      const passengerCount = toPassengerCount(passengersCount ?? passengerNumber, 1);

      await sendBookingCustomerEmail({
        bookingNumber: checkoutReference,
        customerName: String(customerName || "Kund"),
        customerEmail: String(customerEmail),
        tripTitle: emailTripTitle,
        totalAmount: numberAmount,
        paymentUrl,
      });

      emailResult.customerSent = true;

      await sendBookingAdminEmail({
        bookingNumber: checkoutReference,
        customerName: String(customerName || "Kund"),
        customerEmail: String(customerEmail),
        customerPhone: String(customerPhone || ""),
        tripTitle: emailTripTitle,
        passengersCount: passengerCount,
        totalAmount: numberAmount,
      });

      emailResult.adminSent = true;
      emailResult.skipped = false;
    } catch (error: any) {
      emailResult.skipped = false;
      emailResult.error = error?.message || "Mail kunde inte skickas.";
      console.error("[create-and-send-link] Sundra mail error:", error);
    }
  } else {
    emailResult.reason = !isSundraPayment
      ? "not_sundra_payment"
      : !customerEmail
        ? "missing_customer_email"
        : !shouldSend(sendEmail)
          ? "send_email_false"
          : "unknown";
  }

  res.status(200).json({
    ok: true,
    paymentUrl,
    paymentId: sumupData.id || null,
    reference: checkoutReference,
    sumupDryrun,
    sms: smsResult,
    email: emailResult,
  });
}
