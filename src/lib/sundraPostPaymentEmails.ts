import type { NextApiRequest } from "next";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function money(value: any, currency = "SEK") {
  const amount = Number(value || 0);

  return `${amount.toLocaleString("sv-SE", {
    maximumFractionDigits: 0,
  })} ${currency || "SEK"}`;
}

function fmtDate(value: any) {
  if (!value) return "Ej angivet";

  try {
    return new Intl.DateTimeFormat("sv-SE", {
      dateStyle: "long",
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function fmtTime(value: any) {
  if (!value) return "Ej angivet";
  return String(value).slice(0, 5);
}

function getBaseUrl(req: NextApiRequest) {
  const envBase =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_CUSTOMER_BASE_URL ||
    process.env.CUSTOMER_BASE_URL ||
    process.env.VERCEL_URL ||
    "";

  if (envBase) {
    return envBase.startsWith("http")
      ? envBase.replace(/\/$/, "")
      : `https://${envBase.replace(/\/$/, "")}`;
  }

  const proto = String(req.headers["x-forwarded-proto"] || "http");
  const host = String(req.headers.host || "localhost:3000");

  return `${proto}://${host}`;
}

async function getSundraBookingPackage(bookingId: string) {
  const { data: booking, error: bookingErr } = await supabaseAdmin
    .from("sundra_bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (bookingErr || !booking) {
    throw new Error("Sundra-bokningen hittades inte.");
  }

  let trip: any = null;
  let departure: any = null;

  if (booking.trip_id) {
    const { data } = await supabaseAdmin
      .from("sundra_trips")
      .select("*")
      .eq("id", booking.trip_id)
      .maybeSingle();

    trip = data || null;
  }

  if (booking.departure_id) {
    const { data } = await supabaseAdmin
      .from("sundra_departures")
      .select("*")
      .eq("id", booking.departure_id)
      .maybeSingle();

    departure = data || null;
  }

  const { data: passengers } = await supabaseAdmin
    .from("sundra_booking_passengers")
    .select("*")
    .eq("booking_id", booking.id)
    .order("created_at", { ascending: true });

  return {
    booking,
    trip,
    departure,
    passengers: passengers || [],
  };
}

export async function sendSundraPaymentReceipt(input: {
  bookingId: string;
  paymentReference?: string | null;
}) {
  const resendKey = process.env.RESEND_API_KEY;

  if (!resendKey) {
    return {
      ok: false,
      skipped: true,
      error: "RESEND_API_KEY saknas.",
    };
  }

  const { booking, trip, departure, passengers } =
    await getSundraBookingPackage(input.bookingId);

  if (!booking.customer_email) {
    return {
      ok: false,
      skipped: true,
      error: "Kunden saknar e-postadress.",
    };
  }

  const resend = new Resend(resendKey);

  const from =
    process.env.SUNDRA_MAIL_FROM ||
    process.env.MAIL_FROM ||
    process.env.EMAIL_FROM ||
    "Sundra <booking@sundra.se>";

  const bookingNumber = booking.booking_number || booking.id;
  const currency = booking.currency || "SEK";
  const totalAmount = money(booking.total_amount || booking.total_price || booking.amount, currency);
  const tripTitle = trip?.title || booking.trip_title || "Sundra resa";
  const passengerCount =
    Number(booking.passengers_count || booking.passenger_count || passengers.length || 0) || 1;

  const paidAt = booking.paid_at || new Date().toISOString();
  const paymentReference =
    input.paymentReference || booking.payment_reference || bookingNumber;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;padding:24px;color:#0f172a;">
      <div style="background:#0f3f3a;color:white;border-radius:18px;padding:22px;margin-bottom:20px;">
        <h1 style="margin:0;font-size:26px;">Kvitto på din betalning</h1>
        <p style="margin:8px 0 0 0;font-size:15px;opacity:.9;">Tack för din betalning. Din bokning är nu bekräftad.</p>
      </div>

      <div style="border:1px solid #e2e8f0;border-radius:16px;padding:18px;margin-bottom:18px;">
        <h2 style="margin:0 0 12px 0;font-size:20px;">Betalningsuppgifter</h2>
        <p><strong>Bokningsnummer:</strong><br>${bookingNumber}</p>
        <p><strong>Betalt belopp:</strong><br>${totalAmount}</p>
        <p><strong>Betald:</strong><br>${fmtDate(paidAt)}</p>
        <p><strong>Betalningsreferens:</strong><br>${paymentReference}</p>
        <p><strong>Status:</strong><br>Betald</p>
      </div>

      <div style="border:1px solid #e2e8f0;border-radius:16px;padding:18px;margin-bottom:18px;">
        <h2 style="margin:0 0 12px 0;font-size:20px;">Reseinformation</h2>
        <p><strong>Resa:</strong><br>${tripTitle}</p>
        <p><strong>Datum och tid:</strong><br>${fmtDate(departure?.departure_date)} kl. ${fmtTime(departure?.departure_time)}</p>
        <p><strong>Avreseplats:</strong><br>${departure?.departure_location || booking.pickup_place || "Se biljett"}</p>
        <p><strong>Antal resenärer:</strong><br>${passengerCount}</p>
      </div>

      <p style="font-size:14px;color:#475569;">
        Din biljett skickas separat som PDF. Ha biljetten redo vid påstigning.
      </p>
    </div>
  `;

  const text = [
    "Kvitto på din betalning",
    "",
    `Bokningsnummer: ${bookingNumber}`,
    `Betalt belopp: ${totalAmount}`,
    `Betald: ${fmtDate(paidAt)}`,
    `Betalningsreferens: ${paymentReference}`,
    "Status: Betald",
    "",
    `Resa: ${tripTitle}`,
    `Datum och tid: ${fmtDate(departure?.departure_date)} kl. ${fmtTime(departure?.departure_time)}`,
    `Avreseplats: ${departure?.departure_location || booking.pickup_place || "Se biljett"}`,
    `Antal resenärer: ${passengerCount}`,
    "",
    "Din biljett skickas separat som PDF.",
  ].join("\n");

  const result: any = await resend.emails.send({
    from,
    to: booking.customer_email,
    subject: `Kvitto – ${bookingNumber}`,
    html,
    text,
  });

  return {
    ok: true,
    emailId: result?.data?.id || result?.id || null,
    to: booking.customer_email,
  };
}

export async function sendSundraTicketAfterPayment(
  req: NextApiRequest,
  bookingId: string
) {
  try {
    const baseUrl = getBaseUrl(req);

    const response = await fetch(
      `${baseUrl}/api/admin/sundra/bookings/send-ticket`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-sundra-ticket": process.env.INTERNAL_API_SECRET || "internal",
        },
        body: JSON.stringify({
          id: bookingId,
          bookingId,
          reason: "payment_paid",
        }),
      }
    );

    const json = await response.json().catch(() => ({}));

    if (!response.ok || json?.ok === false) {
      return {
        ok: false,
        error: json?.error || "Kunde inte skicka Sundra-biljetten.",
        details: json,
      };
    }

    return {
      ok: true,
      result: json,
    };
  } catch (error: any) {
    return {
      ok: false,
      error: error?.message || "Kunde inte skicka Sundra-biljetten.",
    };
  }
}

export async function sendSundraReceiptAndTicketAfterPayment(
  req: NextApiRequest,
  input: {
    bookingId: string;
    paymentReference?: string | null;
  }
) {
  const receipt = await sendSundraPaymentReceipt({
    bookingId: input.bookingId,
    paymentReference: input.paymentReference || null,
  });

  const ticket = await sendSundraTicketAfterPayment(req, input.bookingId);

  return {
    ok: Boolean(receipt.ok || ticket.ok),
    receipt,
    ticket,
  };
}
