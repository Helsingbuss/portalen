import type { NextApiRequest, NextApiResponse } from "next";
import { Resend } from "resend";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

const resend = new Resend(process.env.RESEND_API_KEY);

function getBaseUrl(req: NextApiRequest) {
  const envUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_CUSTOMER_BASE_URL ||
    process.env.CUSTOMER_BASE_URL ||
    "";

  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  const proto =
    (req.headers["x-forwarded-proto"] as string) ||
    "http";

  const host =
    (req.headers["x-forwarded-host"] as string) ||
    req.headers.host ||
    "127.0.0.1:3000";

  return `${proto}://${host}`;
}

function escapeHtml(value: any) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body || "{}")
        : req.body || {};

    const bookingId =
      body.booking_id ||
      body.bookingId ||
      body.id ||
      null;

    const bookingNumber =
      body.booking_number ||
      body.bookingNumber ||
      null;

    if (!bookingId && !bookingNumber) {
      return res.status(400).json({
        ok: false,
        error: "booking_id eller booking_number saknas.",
      });
    }

    let query = supabase
      .from("sundra_bookings")
      .select("*");

    if (bookingId) {
      query = query.eq("id", bookingId);
    } else {
      query = query.eq("booking_number", bookingNumber);
    }

    const { data: booking, error } = await query.maybeSingle();

    if (error || !booking) {
      console.error("send-ticket booking lookup error", error);

      return res.status(404).json({
        ok: false,
        error: "Kunde inte hitta bokningen.",
      });
    }

    const customerEmail =
      booking.customer_email ||
      booking.email ||
      booking.contact_email ||
      booking.billing_email ||
      null;

    if (!customerEmail) {
      return res.status(400).json({
        ok: false,
        error: "Bokningen saknar e-postadress.",
      });
    }

    const baseUrl = getBaseUrl(req);

    const ticketUrl = `${baseUrl}/api/public/sundra/bookings/${booking.id}/ticket`;

    const customerName =
      booking.customer_name ||
      booking.name ||
      "kund";

    const publicBookingNumber =
      booking.booking_number ||
      bookingNumber ||
      booking.id;

    const subject = `Din biljett från Sundra resor - ${publicBookingNumber}`;

    const html = `
      <div style="font-family: Arial, sans-serif; background:#f6f8fa; padding:24px;">
        <div style="max-width:620px; margin:0 auto; background:#ffffff; border-radius:14px; overflow:hidden; border:1px solid #d8e4ea;">
          <div style="background:#071f2e; padding:26px 30px;">
            <h1 style="margin:0; color:#ffffff; font-size:30px;">Helsingbuss</h1>
            <p style="margin:6px 0 0; color:#a8e6dc; font-size:16px;">Sundra resor</p>
          </div>

          <div style="padding:30px;">
            <h2 style="margin:0 0 10px; color:#0b1f33; font-size:26px;">Din biljett</h2>

            <p style="margin:0 0 18px; color:#4a5b6d; line-height:1.5;">
              Hej ${escapeHtml(customerName)}!<br>
              Här kommer din biljett/bokningsbekräftelse för Sundra resor.
            </p>

            <div style="background:#f2fbfd; border:1px solid #d8e4ea; border-radius:12px; padding:18px; margin:20px 0;">
              <p style="margin:0; color:#526171; font-size:14px;">Bokningsnummer</p>
              <p style="margin:4px 0 0; color:#0b1f33; font-size:20px; font-weight:700;">
                ${escapeHtml(publicBookingNumber)}
              </p>
            </div>

            <a href="${escapeHtml(ticketUrl)}"
              style="display:inline-block; background:#00645d; color:#ffffff; text-decoration:none; padding:14px 22px; border-radius:10px; font-weight:700;">
              Öppna biljett
            </a>

            <p style="margin:22px 0 0; color:#6b7a89; font-size:13px; line-height:1.5;">
              Om knappen inte fungerar kan du kopiera länken här:<br>
              <span style="word-break:break-all;">${escapeHtml(ticketUrl)}</span>
            </p>
          </div>

          <div style="padding:16px 30px; border-top:1px solid #e2ebf0; color:#607080; font-size:13px;">
            Helsingbuss AB · info@helsingbuss.se · helsingbuss.se
          </div>
        </div>
      </div>
    `;

    await resend.emails.send({
      from:
        process.env.RESEND_FROM ||
        "Helsingbuss <noreply@helsingbuss.se>",
      to: customerEmail,
      subject,
      html,
    });

    return res.status(200).json({
      ok: true,
      message: "Biljett skickad som länk utan PDF-bilaga.",
      to: customerEmail,
      ticketUrl,
    });
  } catch (e: any) {
    console.error("/api/admin/sundra/bookings/send-ticket error", e);

    return res.status(500).json({
      ok: false,
      error:
        e?.message ||
        "Kunde inte skicka biljetten.",
    });
  }
}