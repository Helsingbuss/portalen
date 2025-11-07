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

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  if (!resend) {
    console.warn("RESEND_API_KEY saknas; hoppar över sendMail (dev-läge).");
    return { id: "dev-skip", error: null } as const;
  }
  return await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
}

/* =========================
   Bokningsmail helper
========================= */

export type SendBookingParams = {
  to: string;

  // Tillåt båda varianterna så API:t kan skicka "booking_number"
  bookingNumber?: string | null;
  booking_number?: string | null;

  event: "created" | "updated" | "cancelled";

  // Passagerarlista (valfri)
  passengers?: Array<{ name?: string; type?: string }> | null;

  // Frivilliga resefält
  from?: string | null;
  toPlace?: string | null;
  date?: string | null; // ISO eller valfri text
  time?: string | null; // "08:30"
  notes?: string | null;
};

function esc(s?: string | null) {
  return (s ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function subjectForEvent(ev: SendBookingParams["event"], bookingNo: string) {
  switch (ev) {
    case "created":
      return `Bokning bekräftad • #${bookingNo}`;
    case "updated":
      return `Bokning uppdaterad • #${bookingNo}`;
    case "cancelled":
      return `Bokning avbokad • #${bookingNo}`;
  }
}

export async function sendBookingMail(params: SendBookingParams) {
  const bookingNo = params.bookingNumber ?? params.booking_number ?? "—";

  const rowsHtml = [
    params.from ? { label: "Från", value: params.from } : null,
    params.toPlace ? { label: "Till", value: params.toPlace } : null,
    params.date ? { label: "Datum", value: params.date } : null,
    params.time ? { label: "Tid", value: params.time } : null,
    params.notes ? { label: "Anteckningar", value: params.notes } : null,
  ]
    .filter(Boolean)
    .map(
      (r) => `
      <tr>
        <td style="padding:6px 0;color:#0f172a99;font-size:13px;width:36%">${esc(
          (r as any).label
        )}</td>
        <td style="padding:6px 0;color:#0f172a;font-size:14px">${esc(
          (r as any).value
        )}</td>
      </tr>`
    )
    .join("");

  const paxHtml =
    (params.passengers && params.passengers.length > 0
      ? `
  <tr>
    <td style="padding:6px 0;color:#0f172a99;font-size:13px;width:36%">Passagerare</td>
    <td style="padding:6px 0;color:#0f172a;font-size:14px">
      <ul style="margin:0;padding-left:16px">
        ${params.passengers
          .map(
            (p, i) =>
              `<li>${esc(p.name || `Passagerare ${i + 1}`)}${
                p.type ? ` (${esc(p.type)})` : ""
              }</li>`
          )
          .join("")}
      </ul>
    </td>
  </tr>`
      : "") || "";

  const html = `<!doctype html>
<html lang="sv">
  <body style="margin:0;padding:24px;background:#f5f4f0">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr><td align="center">
        <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 6px 20px rgba(0,0,0,0.05)">
          <tr>
            <td style="padding:16px">
              <img src="${LOGO_ABS}" alt="Helsingbuss" style="max-width:220px;height:auto"/>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 10px">
              <h1 style="margin:0 0 6px;color:#194C66;font-size:20px;font-weight:700;">
                Bokning #${esc(bookingNo)}
              </h1>
              <p style="margin:0;color:#0f172ab3;font-size:14px">
                Status: ${
                  params.event === "created"
                    ? "Bekräftad"
                    : params.event === "updated"
                    ? "Uppdaterad"
                    : "Avbokad"
                }
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 16px">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                ${rowsHtml}${paxHtml}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px 24px;color:#0f172a99;font-size:12px;border-top:1px solid #e5e7eb">
              Frågor? Svara på detta mejl eller ring <strong>010-405 38 38</strong> vardagar 8–17.
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  return await sendMail({
    to: params.to,
    subject: subjectForEvent(params.event, bookingNo),
    html,
  });
}

export { ADMIN_TO };
