// src/pages/api/webhooks/stripe.ts
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { Resend } from "resend";
import * as admin from "@/lib/supabaseAdmin";
import {
  generateTicketPdf,
  TicketPdfData,
} from "@/lib/tickets/generateTicketPdf";
import { sendSundraReceiptAndTicketAfterPayment } from "@/lib/sundraPostPaymentEmails";
import { sendSundraBookingConfirmation } from "@/lib/email/sendSundraBookingConfirmation";

export const config = {
  api: {
    bodyParser: false, // viktigt för Stripe (vi behöver rå body)
  },
};

type WebhookResponse = {
  ok: boolean;
  error?: string;
};

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const resendApiKey = process.env.RESEND_API_KEY;
const mailFrom =
  process.env.MAIL_FROM || "Helsingbuss <info@helsingbuss.se>";

// ✅ Env-variabel för admin-notiser
const ticketsInbox =
  process.env.TICKETS_INBOX ||
  process.env.ADMIN_ALERT_EMAIL ||
  "biljetter@helsingbuss.se";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

const stripe = stripeSecret ? new Stripe(stripeSecret) : null;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Läser rå body från request (för Stripe-signatur)
async function readRawBody(req: NextApiRequest): Promise<Buffer> {
  return await new Promise((resolve, reject) => {
    const chunks: any[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

// Hjälp: beräkna moms 6 %
function computeVat(amountSek: number): number {
  if (!amountSek) return 0;
  const vat = amountSek - amountSek / 1.06;
  return Math.round(vat * 100) / 100;
}

// Skapa ett snyggt bokningsnummer baserat på Stripe-sessionen
// Exempel: HB-20251208-9F2A
function buildTicketNumber(session: Stripe.Checkout.Session): string {
  const createdUnix = session.created ?? Math.floor(Date.now() / 1000);
  const d = new Date(createdUnix * 1000);

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());

  const rawId = session.id || "";
  let suffix = rawId.slice(-4).toUpperCase();
  // Rensa bort konstiga tecken
  suffix = suffix.replace(/[^A-Z0-9]/g, "X");

  return `HB-${year}${month}${day}-${suffix}`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WebhookResponse>
) {
  if (req.method !== "POST") {
    // Stripe vill bara ha 200 på andra metoder, så vi svarar OK
    return res.status(200).json({ ok: true });
  }

  if (!stripe || !webhookSecret) {
    console.error("Stripe webhook not configured", {
      hasStripeSecret: !!stripeSecret,
      hasWebhookSecret: !!webhookSecret,
    });
    return res
      .status(500)
      .json({ ok: false, error: "Stripe webhook ej konfigurerad." });
  }

  let event: Stripe.Event;

  try {
    const rawBody = await readRawBody(req);
    const sig = req.headers["stripe-signature"] as string | undefined;

    if (!sig) {
      return res
        .status(400)
        .json({ ok: false, error: "Saknar stripe-signature header." });
    }

    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      webhookSecret
    );
  } catch (err: any) {
    console.error("Stripe webhook signature error", err);
    return res.status(400).json({
      ok: false,
      error: `Webhook verification failed: ${
        err?.message ?? "okänt fel"
      }`,
    });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
    }

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent =
        event.data.object as Stripe.PaymentIntent;

      if (
        paymentIntent.metadata?.source ===
        "helsingbuss_resor"
      ) {
        await handleHelsingbussResorPaymentIntent(
          req,
          paymentIntent
        );
      }
    }
    return res.json({ ok: true });
  } catch (err: any) {
    console.error("Stripe webhook handler error", err);
    return res
      .status(500)
      .json({ ok: false, error: err?.message ?? "Okänt fel i webhook." });
  }
}

async function handleHelsingbussResorPaymentIntent(
  req: NextApiRequest,
  paymentIntent: Stripe.PaymentIntent
) {
  const bookingId =
    String(
      paymentIntent.metadata?.booking_id || ""
    ).trim();

  if (!bookingId) {
    throw new Error(
      "Stripe PaymentIntent missing booking_id."
    );
  }

  const { data: booking, error: bookingError } =
    await supabase
      .from("sundra_bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

  if (bookingError || !booking) {
    throw bookingError ||
      new Error("Booking not found.");
  }

  // Förhindra dubbla mail/biljetter från webhook retries
  if (booking.payment_status === "paid") {
    return;
  }

  const expectedAmount =
    Math.round(
      Number(booking.total_amount || 0) * 100
    );

  if (
    paymentIntent.currency !== "sek" ||
    paymentIntent.amount_received !== expectedAmount
  ) {
    throw new Error(
      "Stripe payment amount does not match booking."
    );
  }

  const {
    data: updatedBooking,
    error: updateError,
  } = await supabase
    .from("sundra_bookings")
    .update({
      status: "confirmed",
      payment_status: "paid",
      payment_reference: paymentIntent.id,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .neq("payment_status", "paid")
    .select()
    .maybeSingle();

  if (updateError) {
    throw updateError;
  }

  if (!updatedBooking) {
    return;
  }

  const { data: trip } =
    await supabase
      .from("sundra_trips")
      .select("*")
      .eq("id", updatedBooking.trip_id)
      .single();

  const { data: departure } =
    await supabase
      .from("sundra_departures")
      .select("*")
      .eq("id", updatedBooking.departure_id)
      .single();

  const { data: passengers } =
    await supabase
      .from("sundra_booking_passengers")
      .select("*")
      .eq("booking_id", updatedBooking.id)
      .order("created_at", {
        ascending: true,
      });

  if (updatedBooking.customer_email) {
    await sendSundraBookingConfirmation({
      to: updatedBooking.customer_email,
      booking: {
        id: updatedBooking.id,
        booking_number: updatedBooking.booking_number,
        customer_name: updatedBooking.customer_name,
        passengers_count:
          updatedBooking.passengers_count ||
          passengers?.length ||
          0,
        total_amount: updatedBooking.total_amount,
        currency: updatedBooking.currency || "SEK",
        payment_status: "paid",
      },
      trip: trip
        ? {
            title: trip.title,
            destination: trip.destination,
            image_url: trip.image_url,
          }
        : null,
      departure: departure
        ? {
            departure_date: departure.departure_date,
            departure_time: departure.departure_time,
            return_date: departure.return_date,
            return_time: departure.return_time,
          }
        : null,
      passengers: passengers || [],
    });
  }

  await sendSundraReceiptAndTicketAfterPayment(
    req,
    {
      bookingId: String(updatedBooking.id),
      paymentReference: paymentIntent.id,
    }
  );
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
) {
  const metadata = session.metadata || {};

  const tripId = metadata.trip_id || "";
  const ticketPricingId = metadata.ticket_id
    ? Number(metadata.ticket_id)
    : undefined;
  const date = metadata.date || ""; // YYYY-MM-DD
  const quantity = metadata.quantity ? Number(metadata.quantity) : 1;

  const customerName =
    metadata.customer_name ||
    session.customer_details?.name ||
    "Okänd resenär";
  const customerEmail =
    session.customer_details?.email ||
    (session.customer_email as string | undefined) ||
    "";
  const customerPhone =
    metadata.customer_phone || session.customer_details?.phone || "";

  // --- Hämta priset från trip_ticket_pricing ---
  let baseAmountSek = 0;

  if (ticketPricingId) {
    const { data: priceRow, error: priceErr } = await supabase
      .from("trip_ticket_pricing")
      .select("price")
      .eq("id", ticketPricingId)
      .single();

    if (priceErr) {
      console.error(
        "Webhook: kunde inte läsa trip_ticket_pricing",
        priceErr
      );
    } else if (priceRow?.price != null) {
      baseAmountSek = Number(priceRow.price) * quantity;
    }
  }

  // Fallback: ta Stripe amount_total om DB-pris saknas
  if (!baseAmountSek && session.amount_total != null) {
    baseAmountSek = session.amount_total / 100;
  }

  const totalSek = baseAmountSek;
  const vatSek = computeVat(totalSek);

  // Skapa ett kort, snyggt bokningsnummer
  const ticketNumber = buildTicketNumber(session);

  // --- Bygg TicketPdfData ---
  const ticketData: TicketPdfData = {
    orderId: session.id,
    ticketId: session.id,
    ticketNumber, // vårt egna korta nummer

    tripTitle: metadata.trip_title || "Malmö C – Gekås Ullared",
    lineName: metadata.line_name || "Linje 1 Helsingbuss",
    operatorName:
      metadata.operator_name || "Norra Skåne Buss AB / Bergkvara",

    departureDate:
      date || new Date().toISOString().slice(0, 10), // YYYY-MM-DD
    departureTime: metadata.departure_time || "06:00",
    returnTime: metadata.return_time || "18:00",
    departureStop: metadata.departure_stop || "Malmö C (Läge k)",

    customerName,
    customerEmail: customerEmail || "info@helsingbuss.se",
    customerPhone,

    passengers: Array.from({ length: quantity }).map((_, index) => ({
      fullName:
        quantity === 1
          ? customerName
          : index === 0
          ? customerName
          : `${customerName} +${index}`,
      seatNumber: "", // kopplas senare när vi har sätesval
      category: "Vuxen",
      price: baseAmountSek / quantity,
    })),

    currency: "SEK",
    baseAmount: baseAmountSek,
    smsTicket: metadata.sms_ticket === "true",
    smsPrice: metadata.sms_price ? Number(metadata.sms_price) : 0,
    cancellationProtection:
      metadata.cancellation_protection === "true",
    cancellationPrice: metadata.cancellation_price
      ? Number(metadata.cancellation_price)
      : 0,
    totalAmount: totalSek,
    vatAmount: vatSek,

    createdAt:
      session.created != null
        ? new Date(session.created * 1000).toISOString()
        : new Date().toISOString(),
    validFrom: date || new Date().toISOString().slice(0, 10),
    validTo: date || new Date().toISOString().slice(0, 10),
    ticketType: "shopping",

    qrPayload: JSON.stringify({
      type: "helsingbuss_ticket",
      session_id: session.id,
      trip_id: tripId,
      ticket_pricing_id: ticketPricingId,
      date,
      quantity,
    }),
  };

  // --- Skapa PDF ---
  const pdfBytes = await generateTicketPdf(ticketData);

  // --- Skicka mail med Resend (HTML + PDF) till kund ---
  if (!resend) {
    console.warn(
      "Resend saknas – biljetten genererades men kunde inte mailas."
    );
    return;
  }

  if (!customerEmail) {
    console.warn(
      "Ingen kund-e-post på session, hoppar över mail men biljetten genererades."
    );
    return;
  }

  // ✅ Bas-URL för "Mitt konto"
  const accountBaseUrl =
    process.env.NEXT_PUBLIC_ACCOUNT_BASE_URL ||
    process.env.ACCOUNT_BASE_URL ||
    process.env.NEXT_PUBLIC_CUSTOMER_BASE_URL ||
    "https://kund.helsingbuss.se";

  const manageUrl = `${accountBaseUrl}/mina-bokningar`;

  // ✅ Länk för att skapa konto / fortsätta registrering
  const encodedEmail = encodeURIComponent(customerEmail || "");
  const encodedBooking = encodeURIComponent(ticketNumber);
  const createAccountUrl = `${accountBaseUrl}/konto/skapa?email=${encodedEmail}&booking=${encodedBooking}`;

  // ✅ Ny subject: bokningsbekräftelse + biljett
  const subject = `Bokningsbekräftelse & e-biljett – ${ticketData.tripTitle} (${ticketData.departureDate})`;

  const text = [
    `Hej ${ticketData.customerName || ""}!`.trim(),
    "",
    "Tack för din bokning hos Helsingbuss.",
    "I detta mail hittar du din e-biljett som PDF-bilaga.",
    "",
    `Bokningsnummer: ${ticketNumber}`,
    "",
    "Visa biljetten i mobilen eller utskriven vid påstigning.",
    "",
    `Resa: ${ticketData.tripTitle}`,
    `Datum: ${ticketData.departureDate}`,
    `Avgångstid: ${ticketData.departureTime}`,
    ticketData.returnTime ? `Retur: ${ticketData.returnTime}` : "",
    "",
    `Totalt pris: ${Math.round(ticketData.totalAmount)} SEK`,
    "",
    "Skapa ett konto hos Helsingbuss för att samla dina bokningar:",
    createAccountUrl,
    "",
    `Du kan också se dina bokningar på: ${manageUrl} (när du är inloggad)`,
    "",
    "Vänliga hälsningar",
    "Helsingbuss",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
  <!DOCTYPE html>
  <html lang="sv">
    <head>
      <meta charset="utf-8" />
      <title>${subject}</title>
    </head>
    <body style="margin:0; padding:0; background-color:#f3f4f6; font-family: Open Sans, Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6; padding:24px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden;">
              <!-- Header -->
              <tr>
                <td style="background-color:#1d2937; padding:16px 24px; color:#ffffff;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="font-size:20px; font-weight:600;">
                        Helsingbuss
                      </td>
                      <td align="right" style="font-size:12px;">
                        Bokningsbekräftelse & e-biljett
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Innehåll -->
              <tr>
                <td style="padding:24px;">
                  <p style="margin:0 0 12px 0; font-size:16px; font-weight:600; color:#1d2937;">
                    Hej ${ticketData.customerName || ""}!
                  </p>

                  <p style="margin:0 0 8px 0; font-size:14px; color:#111827;">
                    Tack för att du reser med <strong>Helsingbuss</strong>.
                  </p>

                  <p style="margin:0 0 12px 0; font-size:14px; color:#111827;">
                    Din <strong>e-biljett</strong finns bifogad som <strong>PDF</strong>.
                    Visa biljetten i mobilen eller utskriven vid påstigning.
                  </p>

                  <p style="margin:0 0 16px 0; font-size:13px; color:#4b5563;">
                    <strong>Bokningsnummer:</strong> ${ticketNumber}
                  </p>

                  <table cellpadding="0" cellspacing="0" style="margin:16px 0; font-size:14px; color:#111827;">
                    <tr>
                      <td style="padding:4px 8px; font-weight:600;">Resa:</td>
                      <td style="padding:4px 8px;">${ticketData.tripTitle}</td>
                    </tr>
                    <tr>
                      <td style="padding:4px 8px; font-weight:600;">Datum:</td>
                      <td style="padding:4px 8px;">${ticketData.departureDate}</td>
                    </tr>
                    <tr>
                      <td style="padding:4px 8px; font-weight:600;">Avgångstid:</td>
                      <td style="padding:4px 8px;">${ticketData.departureTime}</td>
                    </tr>
                    ${
                      ticketData.returnTime
                        ? `
                    <tr>
                      <td style="padding:4px 8px; font-weight:600;">Retur:</td>
                      <td style="padding:4px 8px;">${ticketData.returnTime}</td>
                    </tr>`
                        : ""
                    }
                    <tr>
                      <td style="padding:4px 8px; font-weight:600;">Antal resenärer:</td>
                      <td style="padding:4px 8px;">${
                        ticketData.passengers?.length || 1
                      }</td>
                    </tr>
                    <tr>
                      <td style="padding:4px 8px; font-weight:600;">Totalt pris:</td>
                      <td style="padding:4px 8px;">${Math.round(
                        ticketData.totalAmount
                      )} SEK</td>
                    </tr>
                  </table>

                  <!-- Block: Skapa konto -->
                  <div style="margin:20px 0; padding:16px; background-color:#f9fafb; border-radius:8px; border:1px solid #e5e7eb;">
                    <p style="margin:0 0 8px 0; font-size:14px; font-weight:600; color:#111827;">
                      Skapa konto och samla dina bokningar
                    </p>
                    <p style="margin:0 0 12px 0; font-size:13px; color:#4b5563;">
                      Genom att skapa ett konto hos Helsingbuss kan du enkelt se dina kommande resor,
                      ladda ner biljetter igen och hantera dina uppgifter.
                    </p>

                    <table cellpadding="0" cellspacing="0" style="margin:0 0 8px 0;">
                      <tr>
                        <td>
                          <a href="${createAccountUrl}"
                             style="display:inline-block; padding:10px 18px; background-color:#1d2937; color:#ffffff; text-decoration:none; border-radius:4px; font-size:14px; font-weight:600;">
                            Skapa konto & koppla din bokning
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:0; font-size:12px; color:#6b7280;">
                      När du är inloggad hittar du dina resor under <strong>"Mina bokningar"</strong>.
                    </p>
                  </div>

                  <p style="margin:16px 0 20px 0; font-size:13px; color:#4b5563;">
                    Om du har valt till <strong>SMS-biljett</strong> eller
                    <strong>avbeställningsskydd</strong> ser du det på din e-biljett.
                  </p>

                  <p style="margin:0 0 8px 0; font-size:12px; color:#6b7280;">
                    Vid frågor är du varmt välkommen att kontakta oss på
                    <a href="mailto:info@helsingbuss.se" style="color:#1d4ed8; text-decoration:none;">info@helsingbuss.se</a>.
                  </p>

                  <p style="margin:0; font-size:12px; color:#6b7280;">
                    Vänliga hälsningar<br/>
                    <strong>Helsingbuss</strong>
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color:#f3f4f6; padding:12px 24px; font-size:11px; color:#9ca3af; text-align:center;">
                  Detta mail skickades automatiskt från Helsingbuss bokningssystem.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;

  // 1) Mail till kund med biljett
  await resend.emails.send({
    from: mailFrom,
    to: customerEmail,
    subject,
    text,  // fallback för enkla mailklienter
    html,
    attachments: [
      {
        filename: "biljett.pdf",
        content: Buffer.from(pdfBytes),
      },
    ],
  });

  console.log("✅ E-biljett skickad till", customerEmail, "med nr", ticketNumber);

  // 2) Admin-notis till biljetter@helsingbuss.se (eller TICKETS_INBOX)
  if (ticketsInbox) {
    const adminSubject = `Ny bokning – ${ticketData.tripTitle} (${ticketNumber})`;
    const adminText = [
      "Ny biljettbokning har genomförts.",
      "",
      `Bokningsnummer: ${ticketNumber}`,
      `Kund: ${ticketData.customerName}`,
      `E-post: ${customerEmail}`,
      `Telefon: ${customerPhone || "-"}`,
      "",
      `Resa: ${ticketData.tripTitle}`,
      `Datum: ${ticketData.departureDate}`,
      `Avgångstid: ${ticketData.departureTime}`,
      ticketData.returnTime ? `Retur: ${ticketData.returnTime}` : "",
      "",
      `Antal resenärer: ${ticketData.passengers?.length || 1}`,
      `Totalt pris: ${Math.round(ticketData.totalAmount)} SEK`,
      "",
      "Biljett skickad som PDF till kunden.",
    ]
      .filter(Boolean)
      .join("\n");

    await resend.emails.send({
      from: mailFrom,
      to: ticketsInbox,
      subject: adminSubject,
      text: adminText,
    });

    console.log("📬 Admin-notis skickad till", ticketsInbox);
  }
}
