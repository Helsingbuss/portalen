type Passenger = {
  first_name?: string | null;
  last_name?: string | null;
  passenger_type?: string | null;
};

type SundraBookingEmailInput = {
  to: string;
  booking: {
    id: string;
    booking_number?: string | null;
    customer_name?: string | null;
    passengers_count?: number | null;
    total_amount?: number | null;
    currency?: string | null;
    payment_status?: string | null;
  };
  trip?: {
    title?: string | null;
    destination?: string | null;
    image_url?: string | null;
  } | null;
  departure?: {
    departure_date?: string | null;
    departure_time?: string | null;
    return_date?: string | null;
    return_time?: string | null;
  } | null;
  passengers?: Passenger[];
};

function baseUrl() {
  const raw =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_CUSTOMER_BASE_URL ||
    process.env.CUSTOMER_BASE_URL ||
    "http://localhost:3000";

  return raw.replace(/\/$/, "");
}

function money(value?: number | null, currency = "SEK") {
  if (value == null) return "—";

  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function fmtDate(date?: string | null) {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat("sv-SE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(`${date}T00:00:00`));
  } catch {
    return date;
  }
}

function fmtTime(time?: string | null) {
  if (!time) return "—";
  return String(time).slice(0, 5);
}

function paymentLabel(status?: string | null) {
  switch (status) {
    case "paid":
      return "Betald";
    case "unpaid":
      return "Obetald";
    case "pending_payment":
    case "pending":
      return "Inväntar betalning";
    default:
      return status || "Inväntar betalning";
  }
}

function esc(value: any) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function passengerRows(passengers?: Passenger[]) {
  if (!passengers || passengers.length === 0) {
    return `
      <tr>
        <td colspan="2" style="padding:12px 0;color:#64748b;font-size:14px;">
          Resenärer kommer att visas här när biljetten skapas.
        </td>
      </tr>
    `;
  }

  return passengers
    .map((p, index) => {
      const name = `${p.first_name || ""} ${p.last_name || ""}`.trim() || "—";

      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:14px;">
            ${index + 1}. ${esc(name)}
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:14px;text-align:right;">
            ${esc(p.passenger_type || "Vuxen")}
          </td>
        </tr>
      `;
    })
    .join("");
}

function buildHtml(input: SundraBookingEmailInput) {
  const { booking, trip, departure, passengers } = input;

  const bookingUrl = `${baseUrl()}/min-bokning/${booking.booking_number}`;
  const title = trip?.title || "Din Sundra-resa";
  const heroImage = trip?.image_url || "";
  const currency = booking.currency || "SEK";

  return `
<!doctype html>
<html lang="sv">
  <head>
    <meta charset="utf-8" />
    <title>Bokningsbekräftelse ${esc(booking.booking_number)}</title>
  </head>

  <body style="margin:0;padding:0;background:#f5f4f0;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:24px 12px;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:720px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 18px 45px rgba(15,23,42,0.10);">
            
            ${
              heroImage
                ? `
                  <tr>
                    <td>
                      <img src="${esc(heroImage)}" alt="${esc(title)}" width="720" style="display:block;width:100%;height:260px;object-fit:cover;border:0;" />
                    </td>
                  </tr>
                `
                : ""
            }

            <tr>
              <td style="padding:32px 34px 20px;">
                <div style="display:inline-block;background:#e8f2f6;color:#194C66;border-radius:999px;padding:8px 14px;font-size:13px;font-weight:700;">
                  Bokningsbekräftelse
                </div>

                <h1 style="margin:18px 0 8px;font-size:30px;line-height:1.15;color:#194C66;">
                  Tack för din bokning!
                </h1>

                <p style="margin:0;color:#475569;font-size:15px;line-height:1.7;">
                  Hej ${esc(booking.customer_name || "kund")}! Vi har tagit emot din bokning hos Sundra by Helsingbuss.
                  Din biljett skickas separat när betalningen är registrerad och kommer även att finnas under din bokningssida.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:0 34px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:18px;">
                  <tr>
                    <td style="padding:20px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding-bottom:14px;">
                            <div style="font-size:12px;color:#64748b;">Bokningsnummer</div>
                            <div style="font-size:20px;font-weight:800;color:#0f172a;">${esc(booking.booking_number || "—")}</div>
                          </td>
                          <td style="padding-bottom:14px;text-align:right;">
                            <div style="font-size:12px;color:#64748b;">Betalstatus</div>
                            <div style="font-size:15px;font-weight:800;color:#194C66;">${esc(paymentLabel(booking.payment_status))}</div>
                          </td>
                        </tr>

                        <tr>
                          <td style="padding:12px 0;border-top:1px solid #e2e8f0;">
                            <div style="font-size:12px;color:#64748b;">Resa</div>
                            <div style="font-size:16px;font-weight:700;color:#0f172a;">${esc(title)}</div>
                          </td>
                          <td style="padding:12px 0;border-top:1px solid #e2e8f0;text-align:right;">
                            <div style="font-size:12px;color:#64748b;">Destination</div>
                            <div style="font-size:16px;font-weight:700;color:#0f172a;">${esc(trip?.destination || "—")}</div>
                          </td>
                        </tr>

                        <tr>
                          <td style="padding:12px 0;border-top:1px solid #e2e8f0;">
                            <div style="font-size:12px;color:#64748b;">Avresa</div>
                            <div style="font-size:16px;font-weight:700;color:#0f172a;">${esc(fmtDate(departure?.departure_date))} kl. ${esc(fmtTime(departure?.departure_time))}</div>
                          </td>
                          <td style="padding:12px 0;border-top:1px solid #e2e8f0;text-align:right;">
                            <div style="font-size:12px;color:#64748b;">Retur</div>
                            <div style="font-size:16px;font-weight:700;color:#0f172a;">${esc(fmtDate(departure?.return_date))} kl. ${esc(fmtTime(departure?.return_time))}</div>
                          </td>
                        </tr>

                        <tr>
                          <td style="padding:12px 0;border-top:1px solid #e2e8f0;">
                            <div style="font-size:12px;color:#64748b;">Resenärer</div>
                            <div style="font-size:16px;font-weight:700;color:#0f172a;">${esc(booking.passengers_count || passengers?.length || 0)} st</div>
                          </td>
                          <td style="padding:12px 0;border-top:1px solid #e2e8f0;text-align:right;">
                            <div style="font-size:12px;color:#64748b;">Totalbelopp</div>
                            <div style="font-size:20px;font-weight:900;color:#194C66;">${esc(money(booking.total_amount, currency))}</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:0 34px 24px;">
                <h2 style="margin:0 0 10px;font-size:20px;color:#194C66;">Resenärer</h2>

                <table width="100%" cellpadding="0" cellspacing="0">
                  ${passengerRows(passengers)}
                </table>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:4px 34px 32px;">
                <a href="${esc(bookingUrl)}" style="display:inline-block;background:#194C66;color:#ffffff;text-decoration:none;border-radius:999px;padding:14px 28px;font-size:15px;font-weight:800;">
                  Visa min bokning
                </a>

                <p style="margin:18px 0 0;color:#64748b;font-size:13px;line-height:1.6;">
                  Biljett/PDF skickas separat när betalningen är bekräftad. Har du frågor kan du kontakta oss på
                  <a href="mailto:info@helsingbuss.se" style="color:#194C66;">info@helsingbuss.se</a>.
                </p>
              </td>
            </tr>

            <tr>
              <td style="background:#194C66;padding:22px 34px;color:#ffffff;">
                <div style="font-size:16px;font-weight:800;">Sundra by Helsingbuss</div>
                <div style="margin-top:6px;font-size:13px;line-height:1.6;color:rgba(255,255,255,0.78);">
                  Helsingbuss · Hofverbergsgatan 2B · 254 43 Helsingborg<br />
                  010–405 38 38 · helsingbuss.se
                </div>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `;
}

function buildText(input: SundraBookingEmailInput) {
  const { booking, trip, departure, passengers } = input;
  const bookingUrl = `${baseUrl()}/min-bokning/${booking.booking_number}`;

  return `
Tack för din bokning hos Sundra by Helsingbuss!

Bokningsnummer: ${booking.booking_number || "—"}
Resa: ${trip?.title || "—"}
Destination: ${trip?.destination || "—"}
Avresa: ${fmtDate(departure?.departure_date)} kl. ${fmtTime(departure?.departure_time)}
Retur: ${fmtDate(departure?.return_date)} kl. ${fmtTime(departure?.return_time)}
Resenärer: ${booking.passengers_count || passengers?.length || 0} st
Totalbelopp: ${money(booking.total_amount, booking.currency || "SEK")}
Betalstatus: ${paymentLabel(booking.payment_status)}

Visa min bokning:
${bookingUrl}

Biljett/PDF skickas separat när betalningen är bekräftad.
  `.trim();
}

export async function sendSundraBookingConfirmation(
  input: SundraBookingEmailInput
) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY saknas i env.");
  }

  const from =
    process.env.RESEND_FROM_EMAIL ||
    "Helsingbuss <info@helsingbuss.se>";

  const subject = `Bokningsbekräftelse ${input.booking.booking_number || ""} - ${
    input.trip?.title || "Sundra by Helsingbuss"
  }`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject,
      html: buildHtml(input),
      text: buildText(input),
    }),
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error("Resend Sundra email error:", json);
    throw new Error(json?.message || "Kunde inte skicka bokningsmail.");
  }

  return json;
}
