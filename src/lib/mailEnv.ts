// src/lib/mailEnv.ts
import { Resend } from "resend";

export type MailEnv = {
  hasKey: boolean;
  isProd: boolean;
  from: string;
  replyTo?: string;
  offersInbox: string;
  forceTo?: string | null;
  bccAll: string[];
};

export function readMailEnv(): MailEnv {
  const isProd =
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production";

  const bcc = (process.env.MAIL_BCC_ALL || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  return {
    hasKey: !!process.env.RESEND_API_KEY,
    isProd,
    from: process.env.MAIL_FROM || process.env.EMAIL_FROM || "Helsingbuss <info@helsingbuss.se>",
    replyTo: process.env.EMAIL_REPLY_TO || undefined,
    offersInbox: process.env.OFFERS_INBOX || process.env.ADMIN_ALERT_EMAIL || "info@helsingbuss.se",
    forceTo: process.env.MAIL_FORCE_TO || null,
    bccAll: bcc,
  };
}

export function makeResendOrThrow() {
  const { hasKey, isProd } = readMailEnv();
  if (!hasKey && isProd) {
    // ⛔ Prod utan nyckel – ge tydligt fel istället för ”saknas”-banner i UI
    throw new Error("E-post är inte konfigurerad: RESEND_API_KEY saknas i miljön.");
  }
  // Dev utan nyckel – vi låter kod längre ned simulera utskick
  return new Resend(process.env.RESEND_API_KEY || ""); 
}
