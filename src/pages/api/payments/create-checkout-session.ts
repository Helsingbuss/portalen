// src/pages/api/payments/create-checkout-session.ts
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

const stripeSecret = process.env.STRIPE_SECRET_KEY;

if (!stripeSecret) {
  throw new Error("Missing STRIPE_SECRET_KEY in env");
}

// Viktigt: ange ingen apiVersion här, då slipper vi TypeScript-felet
const stripe = new Stripe(stripeSecret);

type PassengerForm = {
  firstName: string;
  lastName: string;
  personalNumber?: string;
  phone?: string;
  boardingStop?: string;
  note?: string;
};

type CreateSessionBody = {
  trip_id: string;
  departure_date: string; // YYYY-MM-DD
  line_name?: string | null;

  quantity: number;

  ticket: {
    id: number;
    name: string;
    price: number; // i SEK (inte ören)
    currency?: string | null;
  };

  contact: {
    name: string;
    email: string;
    phone?: string;
  };

  passengers: PassengerForm[];
};

type CreateSessionResponse = {
  ok: boolean;
  url?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateSessionResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed (use POST).",
    });
  }

  try {
    const body = req.body as CreateSessionBody;

    const {
      trip_id,
      departure_date,
      line_name,
      quantity,
      ticket,
      contact,
      passengers,
    } = body;

    if (!trip_id || !departure_date || !ticket || !contact?.email || !contact?.name) {
      return res.status(400).json({
        ok: false,
        error: "Saknar nödvändig data för att skapa betalning.",
      });
    }

    const qty = Math.max(1, Number(quantity) || 1);
    const unitAmount = Math.round(ticket.price * 100); // Stripe = ören

    const currency =
      (ticket.currency || process.env.NEXT_PUBLIC_STRIPE_CURRENCY || "SEK").toLowerCase();

    const origin =
      process.env.NEXT_PUBLIC_CUSTOMER_BASE_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "http://localhost:3000";

    const successUrl = `${origin}/kassa/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/kassa/cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card", "klarna", "swish", "link"].filter(Boolean) as any,
      // OBS: Swish kräver separat Stripe-konfiguration – här är bara förberett.

      line_items: [
        {
          quantity: qty,
          price_data: {
            currency,
            unit_amount: unitAmount,
            product_data: {
              name: ticket.name || "Biljett",
              description: `Resa ${trip_id} – avgång ${departure_date}${
                line_name ? `, linje ${line_name}` : ""
              }`,
            },
          },
        },
      ],
      customer_email: contact.email,
      metadata: {
        trip_id,
        departure_date,
        line_name: line_name || "",
        quantity: String(qty),
        contact_name: contact.name,
        contact_phone: contact.phone || "",
        passengers: JSON.stringify(
          (passengers || []).map((p) => ({
            firstName: p.firstName,
            lastName: p.lastName,
            boardingStop: p.boardingStop || "",
          }))
        ),
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return res.status(200).json({
      ok: true,
      url: session.url || undefined,
    });
  } catch (err: any) {
    console.error("Stripe checkout error", err);
    const msg =
      err?.type === "StripeCardError"
        ? err.message
        : err?.message || "Tekniskt fel vid skapande av betalning.";
    return res.status(500).json({
      ok: false,
      error: msg,
    });
  }
}
