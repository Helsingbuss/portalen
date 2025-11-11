// src/lib/sendMail.ts
import { Resend } from "resend";

/**
 * ENV & klient
 */
const resendApiKey = (process.env.RESEND_API_KEY ?? "").trim();
const resend = new Resend(resendApiKey);

// Helper för säkert env-läsning
const env = (v?: string | null) => (v ?? "").trim();

// Adresser från .env (behåller dina defaultar)
const SUPPORT_INBOX = env(process.env.SUPPORT_INBOX) || "kundteam@helsingbuss.se";
const OFFERS_INBOX  = env(process.env.OFFERS_INBOX)  || "offert@helsingbuss.se";

// Låt FROM vara styrbart i .env, men ha bra fallback
// OBS: se till att MAIL_FROM-domänen är verifierad i Resend
const DEFAULT_FROM = env(process.env.MAIL_FROM) || "Helsingbuss <no-reply@helsingbuss.se>";

/**
 * Typer
 */
export type SendMailOpts = {
  to: string | string[];
  subject: string;
  html: string;
  // nya fält
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string | string[];
  // meta-flaggor
  mirrorToOffersInbox?: boolean; // bcc:a OFFERS_INBOX automatiskt
};

/**
 * Utils
 */
function toArray(x?: string | string[]): string[] {
  if (!x) return [];
  return Array.isArray(x) ? x : [x];
}

// enkel "sanitizer": trim + ta bort tomma + dedupe (case-insensitiv jämförelse)
function sanitizeAddressList(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const s = (raw || "").trim();
    if (!s) continue;
    // jämför dedupe i lower, men behåll original casing
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

/**
 * Huvud-funktion
 */
export async function sendMail(opts: SendMailOpts) {
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY saknas");
  }
  if (!opts?.to) {
    throw new Error("sendMail: 'to' saknas");
  }
  if (!opts.subject) {
    throw new Error("sendMail: 'subject' saknas");
  }
  if (!opts.html) {
    throw new Error("sendMail: 'html' saknas");
  }

  // Normalisera mottagare
  const to  = sanitizeAddressList(toArray(opts.to));
  const cc  = sanitizeAddressList(toArray(opts.cc));
  const bcc = sanitizeAddressList(toArray(opts.bcc));

  if (to.length === 0) {
    throw new Error("sendMail: 'to' tom efter normalisering");
  }

  // Bygg slutlig BCC-lista + spegling till OFFERS_INBOX om flaggad
  const finalBccSet = new Set<string>(bcc.map((x) => x.toLowerCase()));
  if (opts.mirrorToOffersInbox && OFFERS_INBOX) {
    finalBccSet.add(OFFERS_INBOX.toLowerCase());
    if (process.env.NODE_ENV !== "production") {
      console.log(`[sendMail] BCC → OFFERS_INBOX: ${OFFERS_INBOX}`);
    }
  }

  // undvik dubbletter mellan to/cc/bcc
  const toLower = new Set(to.map((x) => x.toLowerCase()));
  const ccLower = new Set(cc.map((x) => x.toLowerCase()));

  // ta bort alla BCC som redan ligger i TO/CC
  for (const addr of Array.from(finalBccSet)) {
    if (toLower.has(addr) || ccLower.has(addr)) {
      finalBccSet.delete(addr);
    }
  }

  const finalBcc = Array.from(finalBccSet);

  // Reply-To (default till SUPPORT_INBOX)
  const replyToList = sanitizeAddressList(toArray(opts.replyTo));
  const reply_to = replyToList.length ? replyToList : [SUPPORT_INBOX];

  // Resend payload
  const payload: any = {
    from: DEFAULT_FROM,
    to,
    subject: opts.subject,
    html: opts.html,
  };

  if (cc.length) payload.cc = cc;
  if (finalBcc.length) payload.bcc = finalBcc;
  if (reply_to.length) payload.reply_to = reply_to;

  const result = await resend.emails.send(payload);

  // enkel felhantering/logg
  const anyErr = (result as any)?.error;
  if (anyErr) {
    const emsg = anyErr.message || "Okänt Resend-fel";
    throw new Error(`Resend error: ${emsg}`);
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`[sendMail] OK, id=${(result as any)?.id ?? "unknown"}`);
  }

  return result;
}

/**
 * Hjälp: spegla alltid till OFFERS_INBOX (praktiskt för offert-utskick)
 */
export async function sendMailWithOfferMirror(
  opts: Omit<SendMailOpts, "mirrorToOffersInbox">
) {
  return sendMail({ ...opts, mirrorToOffersInbox: true });
}
