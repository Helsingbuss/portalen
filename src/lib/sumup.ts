import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function baseUrl() {
  return (
    process.env.CUSTOMER_BASE_URL ||
    process.env.NEXT_PUBLIC_CUSTOMER_BASE_URL ||
    "https://kund.helsingbuss.se"
  ).replace(/\/$/, "");
}

export async function sendBookingCustomerEmail({
  bookingNumber,
  customerName,
  customerEmail,
  tripTitle,
  totalAmount,
  paymentUrl,
}: {
  bookingNumber: string;
  customerName: string;
  customerEmail: string;
  tripTitle: string;
  totalAmount: number;
  paymentUrl: string;
}) {
  const from =
    process.env.MAIL_FROM ||
    process.env.EMAIL_FROM ||
    process.env.RESEND_FROM_FALLBACK;

  await resend.emails.send({
    from: from!,
    to: customerEmail,
    reply_to: process.env.EMAIL_REPLY_TO || undefined,

    subject: `Bokning mottagen - ${bookingNumber}`,

    html: `
      <div style="font-family:Arial,sans-serif;padding:20px;">
        <h1 style="color:#0B2A44;">
          Tack för din bokning hos Helsingbuss
        </h1>

        <p>
          Hej ${customerName},
        </p>

        <p>
          Vi har mottagit din bokning för:
        </p>

        <p>
          <strong>${tripTitle}</strong>
        </p>

        <p>
          Bokningsnummer:<br>
          <strong>${bookingNumber}</strong>
        </p>

        <p>
          Totalt att betala:<br>
          <strong>${Number(totalAmount).toLocaleString("sv-SE")} SEK</strong>
        </p>

        <div style="margin:35px 0;">
          <a
            href="${paymentUrl}"
            style="
              background:#0B7A75;
              color:white;
              text-decoration:none;
              padding:14px 24px;
              border-radius:10px;
              font-weight:bold;
              display:inline-block;
            "
          >
            Betala bokning
          </a>
        </div>

        <p style="color:#666;">
          När betalningen är genomförd skickas din bokningsbekräftelse automatiskt.
        </p>

        <hr style="margin:30px 0;" />

        <p style="font-size:13px;color:#777;">
          Helsingbuss<br>
          https://helsingbuss.se
        </p>
      </div>
    `,
  });
}

export async function sendBookingAdminEmail({
  bookingNumber,
  customerName,
  customerEmail,
  customerPhone,
  tripTitle,
  passengersCount,
  totalAmount,
}: {
  bookingNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  tripTitle: string;
  passengersCount: number;
  totalAmount: number;
}) {
  const from =
    process.env.MAIL_FROM ||
    process.env.EMAIL_FROM ||
    process.env.RESEND_FROM_FALLBACK;

  const adminEmail =
    process.env.TRAVELS_ADMIN_EMAIL ||
    process.env.ADMIN_ALERT_EMAIL;

  if (!adminEmail) return;

  await resend.emails.send({
    from: from!,
    to: adminEmail,
    reply_to: process.env.EMAIL_REPLY_TO || undefined,

    subject: `Ny resebokning - ${bookingNumber}`,

    html: `
      <div style="font-family:Arial,sans-serif;padding:20px;">
        <h1 style="color:#0B2A44;">
          Ny resebokning mottagen
        </h1>

        <table cellpadding="8" cellspacing="0">
          <tr>
            <td><strong>Bokningsnummer</strong></td>
            <td>${bookingNumber}</td>
          </tr>

          <tr>
            <td><strong>Resa</strong></td>
            <td>${tripTitle}</td>
          </tr>

          <tr>
            <td><strong>Kund</strong></td>
            <td>${customerName}</td>
          </tr>

          <tr>
            <td><strong>E-post</strong></td>
            <td>${customerEmail}</td>
          </tr>

          <tr>
            <td><strong>Telefon</strong></td>
            <td>${customerPhone}</td>
          </tr>

          <tr>
            <td><strong>Antal resenärer</strong></td>
            <td>${passengersCount}</td>
          </tr>

          <tr>
            <td><strong>Belopp</strong></td>
            <td>${Number(totalAmount).toLocaleString("sv-SE")} SEK</td>
          </tr>
        </table>

        <hr style="margin:30px 0;" />

        <p style="font-size:13px;color:#777;">
          Helsingbuss Systemnotis
        </p>
      </div>
    `,
  });
}
