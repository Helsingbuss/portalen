import type { NextApiRequest, NextApiResponse } from "next";
import { Resend } from "resend";
import * as admin from "@/lib/supabaseAdmin";

const resend = new Resend(
  process.env.RESEND_API_KEY
);

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

function fmtDate(date?: string | null) {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat(
      "sv-SE",
      {
        dateStyle: "medium",
      }
    ).format(
      new Date(`${date}T00:00:00`)
    );
  } catch {
    return date;
  }
}

function fmtTime(
  time?: string | null
) {
  if (!time) return "—";
  return String(time).slice(0, 5);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error:
          "Method not allowed",
      });
    }

    const {
      booking_id,
    } = req.body || {};

    if (!booking_id) {
      return res.status(400).json({
        ok: false,
        error:
          "booking_id saknas.",
      });
    }

    // =========================
    // BOOKING
    // =========================
    const {
      data: booking,
      error,
    } = await supabase
      .from(
        "sundra_bookings"
      )
      .select(`
        *,
        sundra_trips (
          title,
          destination
        ),
        sundra_departures (
          departure_date,
          departure_time,
          return_date,
          return_time,
          departure_location
        )
      `)
      .eq("id", booking_id)
      .single();

    if (error || !booking) {
      throw (
        error ||
        new Error(
          "Bokningen hittades inte."
        )
      );
    }

    if (
      !booking.customer_email
    ) {
      return res.status(400).json({
        ok: false,
        error:
          "Kunden saknar e-postadress.",
      });
    }

    // =========================
    // PDF URL
    // =========================
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";

    const pdfUrl = `${baseUrl}/api/public/sundra/bookings/${booking.id}/ticket`;

    const portalUrl = `${baseUrl}/min-bokning/${booking.booking_number}`;

    // =========================
    // MAIL
    // =========================
    const mail =
      await resend.emails.send({
        from:
          "Helsingbuss <noreply@helsingbuss.se>",

        to: booking.customer_email,

        subject: `Din biljett – ${booking.booking_number}`,

        html: `
          <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;padding:24px;">
            
            <h1 style="color:#194C66;margin-bottom:10px;">
              Din biljett är klar 🎫
            </h1>

            <p style="font-size:15px;color:#374151;line-height:1.7;">
              Tack för din betalning. Din biljett och QR-kod är nu aktiverad.
            </p>

            <div style="margin-top:24px;padding:20px;border-radius:16px;background:#f8fafc;border:1px solid #e5e7eb;">
              
              <h2 style="margin-top:0;color:#194C66;">
                Resinformation
              </h2>

              <p>
                <strong>Bokningsnummer:</strong>
                ${booking.booking_number}
              </p>

              <p>
                <strong>Resa:</strong>
                ${
                  booking
                    .sundra_trips
                    ?.title || "Sundra resa"
                }
              </p>

              <p>
                <strong>Destination:</strong>
                ${
                  booking
                    .sundra_trips
                    ?.destination || "—"
                }
              </p>

              <p>
                <strong>Avgång:</strong>
                ${fmtDate(
                  booking
                    .sundra_departures
                    ?.departure_date
                )} kl ${fmtTime(
          booking
            .sundra_departures
            ?.departure_time
        )}
              </p>

              <p>
                <strong>Påstigning:</strong>
                ${
                  booking
                    .sundra_departures
                    ?.departure_location ||
                  "—"
                }
              </p>

            </div>

            <div style="margin-top:24px;">
              
              <a
                href="${pdfUrl}"
                style="
                  display:inline-block;
                  background:#194C66;
                  color:#ffffff;
                  text-decoration:none;
                  padding:14px 22px;
                  border-radius:999px;
                  font-weight:600;
                  margin-right:10px;
                "
              >
                Ladda ner biljett
              </a>

              <a
                href="${portalUrl}"
                style="
                  display:inline-block;
                  background:#0f766e;
                  color:#ffffff;
                  text-decoration:none;
                  padding:14px 22px;
                  border-radius:999px;
                  font-weight:600;
                "
              >
                Min bokning
              </a>

            </div>

            <p style="margin-top:32px;font-size:14px;color:#6b7280;line-height:1.7;">
              Visa QR-koden vid boarding för snabb incheckning.
            </p>

          </div>
        `,
      });

    return res.status(200).json({
      ok: true,
      mail,
    });
  } catch (e: any) {
    console.error(
      "/api/admin/sundra/bookings/send-ticket error:",
      e
    );

    return res.status(500).json({
      ok: false,
      error:
        e?.message ||
        "Kunde inte skicka biljett.",
    });
  }
}
