// src/lib/sendMail.ts
import { Resend } from "resend";

/** Bas-URL för portalen (admin/dash) */
export function baseUrl() {
  const raw = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/$/, "");
  return raw || "http://localhost:3000";
}

/** Bas-URL för kundportalen (offert/offerter) */
export function customerBaseUrl() {
  const fromEnv =
    process.env.CUSTOMER_BASE_URL || process.env.NEXT_PUBLIC_CUSTOMER_BASE_URL;
  if (fromEnv) return fromEnv;

  if (process.env.VERCEL_ENV === "production") {
    return "https://kund.helsingbuss.se";
  }
  return "http://localhost:3000";
}

/** Bas-URL för admin-login */
export function adminBaseUrl() {
  const fromEnv =
    process.env.ADMIN_BASE_URL || process.env.NEXT_PUBLIC_ADMIN_BASE_URL;
  if (fromEnv) return fromEnv;

  if (process.env.VERCEL_ENV === "production") {
    return "https://login.helsingbuss.se";
  }
  return "http://localhost:3000";
}

export const FROM =
  process.env.MAIL_FROM || "Helsingbuss <info@helsingbuss.se>";
export const ADMIN_TO =
  process.env.MAIL_ADMIN || "offert@helsingbuss.se";
export const LOGO_ABS = `${baseUrl()}/mork_logo.png`;

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

/** Liten helper för HTML-escaping i enkla texter */
function esc(s?: string | null) {
  return (s ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Generisk sändare via Resend
 */
export async function sendMail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string; // valfritt, default FROM
}) {
  if (!resend) {
    console.warn("RESEND_API_KEY saknas; hoppar över sendMail (dev-läge).");
    return { id: "dev-skip", error: null } as const;
  }

  return await resend.emails.send({
    from: opts.from || FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
}

/**
 * Typ för bokningsmail (OBS: bookingNumber i camelCase)
 */
export type SendBookingParams = {
  to: string;
  bookingNumber: string;
  event: "created" | "updated" | "canceled";
  passengers?: any[] | null;

  // valfria meta-fält (kan lämnas null)
  from?: string | null;
  toPlace?: string | null;
  date?: string | null;
  time?: string | null;
  notes?: string | null;
};

/**
 * Skicka bokningsmail till kund
 * Anropas från API: await sendBookingMail({ to, bookingNumber, event, ... })
 */
export async function sendBookingMail(p: SendBookingParams) {
  const titleMap: Record<SendBookingParams["event"], string> = {
    created: "Din bokning är registrerad",
    updated: "Din bokning har uppdaterats",
    canceled: "Din bokning har avbokats",
  };
  const subject = `Bokning ${p.bookingNumber} – ${titleMap[p.event]}`;

  const rowsHtml = [
    ["Bokningsnummer", p.bookingNumber],
    ["Från", p.from ?? "—"],
    ["Till", p.toPlace ?? "—"],
    ["Datum", p.date ?? "—"],
    ["Tid", p.time ?? "—"],
    ["Notering", p.notes ?? "—"],
    ["Passagerare", Array.isArray(p.passengers) ? String(p.passengers.length) : "—"],
  ]
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:6px 0;color:#0f172a80;font-size:12px;width:42%">${esc(
            label
          )}</td>
          <td style="padding:6px 0;color:#0f172a;font-size:14px">${esc(
            value as string
          )}</td>
        </tr>`
    )
    .join("");

  const html = `<!doctype html>
  <html lang="sv">
    <body style="margin:0;padding:24px;background:#f5f4f0">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr><td align="center">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:12px;overflow:hidden">
            <tr>
              <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb">
                <img src="${LOGO_ABS}" alt="Helsingbuss" style="max-width:180px;height:auto" />
              </td>
            </tr>
            <tr>
              <td style="padding:20px 20px 0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial">
                <h1 style="margin:0 0 12px 0;color:#0f172a;font-size:18px;line-height:1.3">${esc(
                  titleMap[p.event]
                )}</h1>
                <p style="margin:0 0 16px 0;color:#334155;font-size:14px">
                  Här är en sammanfattning av din bokning hos Helsingbuss.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 20px 4px">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  ${rowsHtml}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 20px;color:#64748b;font-size:12px;border-top:1px solid #e5e7eb">
                Frågor om din resa? Ring vårt Kundteam vardagar 8–17: <strong>010-405 38 38</strong> eller svara på detta mail.
                Vid akuta trafikärenden utanför kontorstid: <strong>010-777 21 58</strong>.
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
  </html>`;

  return await sendMail({
    to: p.to,
    subject,
    html,
  });
}
