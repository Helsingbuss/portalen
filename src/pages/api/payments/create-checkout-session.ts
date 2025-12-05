// src/pages/api/payments/create-checkout-session.ts
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripeCurrency = process.env.NEXT_PUBLIC_STRIPE_CURRENCY || "SEK";

let stripe: Stripe | null = null;

if (stripeSecret) {
  stripe = new Stripe(stripeSecret, {
    // matchar den API-version som Stripe-SDK:t förväntar sig hos dig
    apiVersion: "2025-11-17.clover",
  });
}

type CreateSessionBody = {
  trip_id: string;
  date: string; // YYYY-MM-DD
  quantity: number;
  ticket_id: number;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
};

type CreateSessionResponse = {
  ok: boolean;
  url?: string;
  error?: string;
};

// Säkerställ att vi alltid har en FULL URL med https:// osv
function ensureBaseUrl(): string {
  const raw =
    (process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXT_PUBLIC_CUSTOMER_BASE_URL ||
      process.env.CUSTOMER_BASE_URL ||
      "").trim();

  if (!raw) {
    return "http://localhost:3000";
  }

  let url = raw;

  // lägg på https:// om den saknas
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url.replace(/^\/+/, "");
  }

  // ta bort ev. avslutande /
  if (url.endsWith("/")) {
    url = url.slice(0, -1);
  }

  return url;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateSessionResponse>
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed (use POST)." });
  }

  if (!stripe) {
    console.error("create-checkout-session | Stripe secret key saknas", {
      hasSecret: !!stripeSecret,
    });
    return res.status(500).json({
      ok: false,
      error: "Betalning är inte konfigurerad (saknar Stripe-nyckel).",
    });
  }

  try {
    const body = req.body as CreateSessionBody;

    if (!body.trip_id || !body.ticket_id || !body.date || !body.quantity) {
      return res.status(400).json({
        ok: false,
        error: "Saknar nödvändig information (resa, biljett eller datum).",
      });
    }

    // Hämta priset för vald biljettrad
    const { data: priceRow, error: priceErr } = await supabase
      .from("trip_ticket_pricing")
      .select("price, currency")
      .eq("id", body.ticket_id)
      .single();

    if (priceErr || !priceRow) {
      console.error("create-checkout-session | priceErr", priceErr);
      return res.status(400).json({
        ok: false,
        error: "Kunde inte hitta pris för vald biljett.",
      });
    }

    const currency: string = priceRow.currency || stripeCurrency;
    const unitAmount = Math.round(Number(priceRow.price) * 100);

    const baseUrl = ensureBaseUrl();
    const successUrl = `${baseUrl}/kassa/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/kassa/cancel`;

    console.log("create-checkout-session | urls", {
      baseUrl,
      successUrl,
      cancelUrl,
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card", "klarna", "link"], // Apple/Google Pay ingår i "card"
      locale: "sv",
      line_items: [
        {
          quantity: body.quantity,
          price_data: {
            currency,
            unit_amount: unitAmount,
            product_data: {
              name: "Bussresa",
              description: `Avgång ${body.date}`,
            },
          },
        },
      ],
      customer_email: body.customer?.email,
      metadata: {
        trip_id: body.trip_id,
        date: body.date,
        ticket_id: String(body.ticket_id),
        quantity: String(body.quantity),
        customer_name: body.customer?.name || "",
        customer_phone: body.customer?.phone || "",
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    if (!session.url) {
      throw new Error("Stripe skapade ingen checkout-URL.");
    }

    return res.status(200).json({ ok: true, url: session.url });
  } catch (e: any) {
    console.error("create-checkout-session error", e);
    return res.status(500).json({
      ok: false,
      error: e?.message || "Tekniskt fel vid betalning.",
    });
  }
}
