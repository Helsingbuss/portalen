import { Resend } from "resend";

/** Bas-URL för portalen (admin/dash) */
export function baseUrl() {
  const raw = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/$/, "");
  return raw || "http://localhost:3000";
}

/** Bas-URL för kundportalen (offert/offerter) */
export function customerBaseUrl() {
  const fromEnv =
    process.env.CUSTOMER_BASE_URL ||
    process.env.NEXT_PUBLIC_CUSTOMER_BASE_URL;
  if (fromEnv) return fromEnv;

  if (process.env.VERCEL_ENV === "production") {
    return "https://kund.helsingbuss.se";
  }
  return "http://localhost:3000";
}

/** Bas-URL för admin-login */
export function adminBaseUrl() {
  const fromEnv =
    process.env.ADMIN_BASE_URL ||
    process.env.NEXT_PUBLIC_ADMIN_BASE_URL;
  if (fromEnv) return fromEnv;

  if (process.env.VERCEL_ENV === "production") {
    return "https://login.helsingbuss.se";
  }
  return "http://localhost:3000";
}

export const FROM = process.env.MAIL_FROM || "Helsingbuss <info@helsingbuss.se>";
export const ADMIN_TO = process.env.MAIL_ADMIN || "offert@helsingbuss.se";
export const LOGO_ABS = ${baseUrl()}/mork_logo.png;

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

/**
 * Tunn wrapper runt Resend
 */
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
