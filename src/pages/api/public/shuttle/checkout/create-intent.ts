import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

type CreateIntentBody = {
  amount?: number;
  currency?: string;
  customer?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  trip?: {
    from?: string;
    to?: string;
    date?: string;
    departureId?: string;
    departureTime?: string;
    arrivalTime?: string;
    line?: string;
  };
  passengers?: {
    adults?: number;
    children?: number;
    youth?: number;
    seniors?: number;
  };
  ticket?: {
    ticketType?: string;
    comfort?: string;
    ticketPrice?: number;
  };
  addons?: {
    extraBaggage?: number;
    specialBaggage?: number;
    cancellationProtection?: boolean;
    smsTicket?: boolean;
    addonsTotal?: number;
  };
};

function setCors(req: NextApiRequest, res: NextApiResponse) {
  const allowedOrigins = [
    "http://localhost:3000",
    "https://hbshuttle.se",
    "https://www.hbshuttle.se",
  ];

  const origin = req.headers.origin || "";

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function toStripeAmountSek(amount: number) {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

function cleanText(value: unknown) {
  return String(value || "").trim().slice(0, 400);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    return res.status(500).json({
      ok: false,
      error: "STRIPE_SECRET_KEY saknas i portalen.",
    });
  }

  try {
    const body = req.body as CreateIntentBody;

    const currency = String(
      body.currency ||
        process.env.STRIPE_CURRENCY ||
        "sek"
    ).toLowerCase();

    const amountSek = Number(body.amount || 0);
    const amount = toStripeAmountSek(amountSek);

    if (!amount || amount < 500) {
      return res.status(400).json({
        ok: false,
        error: "Beloppet är för lågt eller saknas.",
      });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-11-17.clover",
    });

    const bookingReference = `HB-${Date.now()}`;

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
      receipt_email: body.customer?.email || undefined,
      description: `HB Shuttle ${body.trip?.from || ""} - ${body.trip?.to || ""}`,
      metadata: {
        bookingReference,
        source: "hbshuttle",
        product: "airport_shuttle",

        customerFirstName: cleanText(body.customer?.firstName),
        customerLastName: cleanText(body.customer?.lastName),
        customerEmail: cleanText(body.customer?.email),
        customerPhone: cleanText(body.customer?.phone),

        from: cleanText(body.trip?.from),
        to: cleanText(body.trip?.to),
        date: cleanText(body.trip?.date),
        departureId: cleanText(body.trip?.departureId),
        departureTime: cleanText(body.trip?.departureTime),
        arrivalTime: cleanText(body.trip?.arrivalTime),
        line: cleanText(body.trip?.line),

        adults: String(body.passengers?.adults || 0),
        children: String(body.passengers?.children || 0),
        youth: String(body.passengers?.youth || 0),
        seniors: String(body.passengers?.seniors || 0),

        ticketType: cleanText(body.ticket?.ticketType),
        comfort: cleanText(body.ticket?.comfort),
        ticketPrice: String(body.ticket?.ticketPrice || 0),

        extraBaggage: String(body.addons?.extraBaggage || 0),
        specialBaggage: String(body.addons?.specialBaggage || 0),
        cancellationProtection: body.addons?.cancellationProtection ? "1" : "0",
        smsTicket: body.addons?.smsTicket ? "1" : "0",
        addonsTotal: String(body.addons?.addonsTotal || 0),

        totalAmountSek: String(amountSek),
      },
    });

    return res.status(200).json({
      ok: true,
      bookingReference,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount,
      currency,
    });
  } catch (error: any) {
    console.error("Stripe create intent error:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Kunde inte skapa Stripe-betalning.",
    });
  }
}
