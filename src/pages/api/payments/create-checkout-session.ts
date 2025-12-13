// src/pages/api/payments/create-checkout-session.ts
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripeCurrencyEnv =
  process.env.NEXT_PUBLIC_STRIPE_CURRENCY || "SEK";

let stripe: Stripe | null = null;

// Initiera Stripe-klienten om vi har hemliga nyckeln
if (stripeSecret) {
  stripe = new Stripe(stripeSecret);
}

type CreateSessionBody = {
  trip_id: string;
  date: string; // YYYY-MM-DD
  quantity: number;
  ticket_id: number;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };

  // Extra metadata om resan – kan skickas från frontend senare
  trip_meta?: {
    trip_title?: string;
    line_name?: string;
    operator_name?: string;
    departure_time?: string;   // HH:MM
    return_time?: string;      // HH:MM
    departure_stop?: string;   // t.ex. "Malmö C (Läge k)"
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

    // Försök hämta resans titel från trips-tabellen
    let tripTitleFromDb: string | undefined;

    try {
      const { data: tripRow, error: tripErr } = await supabase
        .from("trips")
        .select("title")
        .eq("id", body.trip_id)
        .single();

      if (tripErr) {
        console.warn(
          "create-checkout-session | kunde inte läsa trips.title",
          tripErr
        );
      } else if (tripRow?.title) {
        tripTitleFromDb = tripRow.title as string;
      }
    } catch (e) {
      console.warn(
        "create-checkout-session | oväntat fel vid hämtning av trips.title",
        e
      );
    }

    // Trip-metadata – frontend kan skicka in egna värden,
    // annars använder vi DB-titel som rubrik.
    const extraMeta = body.trip_meta || {};

    const tripTitle =
      extraMeta.trip_title ||
      tripTitleFromDb ||
      "Bussresa";

    const lineName = extraMeta.line_name || "";           // "Linje 1 Helsingbuss" osv – fylls senare
    const operatorName = extraMeta.operator_name || "";   // "Norra Skåne Buss AB / Bergkvara" – fylls senare
    const departureTime = extraMeta.departure_time || ""; // HH:MM – fylls senare
    const returnTime = extraMeta.return_time || "";       // HH:MM – fylls senare
    const departureStop = extraMeta.departure_stop || ""; // t.ex. "Malmö C (Läge k)" – fylls senare

    const currency: string = (priceRow.currency ||
      stripeCurrencyEnv).toLowerCase();
    const unitAmount = Math.round(Number(priceRow.price) * 100);

    const baseUrl = ensureBaseUrl();
    const successUrl = `${baseUrl}/kassa/tack?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/kassa/avbruten`;

    console.log("create-checkout-session | urls", {
      baseUrl,
      successUrl,
      cancelUrl,
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // Apple/Google Pay ingår i "card". Swish är borttagen så länge.
      payment_method_types: ["card", "klarna", "link"],
      locale: "sv",
      line_items: [
        {
          quantity: body.quantity,
          price_data: {
            currency,
            unit_amount: unitAmount,
            product_data: {
              name: tripTitle || "Bussresa",
              description: `Avgång ${body.date}`,
            },
          },
        },
      ],
      customer_email: body.customer?.email || undefined,
      metadata: {
        trip_id: body.trip_id,
        date: body.date,
        ticket_id: String(body.ticket_id),
        quantity: String(body.quantity),
        customer_name: body.customer?.name || "",
        customer_phone: body.customer?.phone || "",

        // Ny metadata till e-biljetten / webhooken
        trip_title: tripTitle,
        line_name: lineName,
        operator_name: operatorName,
        departure_time: departureTime,
        return_time: returnTime,
        departure_stop: departureStop,

        // Extra: spara kundens e-post även i metadata
        customer_email: body.customer?.email || "",
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
