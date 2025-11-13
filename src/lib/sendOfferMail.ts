// src/lib/sendOfferMail.ts
import { Resend } from "resend";
import { createOfferToken } from "@/lib/offerToken";

export type SendOfferParams = {
  offerId: string;
  offerNumber: string;
  customerEmail: string;
  customerName?: string | null;
  customerPhone?: string | null;
  from?: string | null;
  to?: string | null;
  date?: string | null;
  time?: string | null;
  passengers?: number | null;
  via?: string | null;
  onboardContact?: string | null;
  return_from?: string | null;
  return_to?: string | null;
  return_date?: string | null;
  return_time?: string | null;
  notes?: string | null;
};

const env = (v?: string | null) => (v ?? "").toString().trim();
const stripQuotes = (s?: string | null) => env(s).replace(/^["']|["']$/g, "");

const RESEND_KEY = env(process.env.RESEND_API_KEY);
const FROM_PRIMARY = stripQuotes(process.env.MAIL_FROM) || "Helsingbuss <no-reply@helsingbuss.se>";
const FROM_FALLBACK = stripQuotes(process.env.RESEND_FROM_FALLBACK) || "Helsingbuss <onboarding@resend.dev>";
const REPLY_TO = stripQuotes(process.env.EMAIL_REPLY_TO);

const OFFERS_INBOX = stripQuotes(process.env.OFFERS_INBOX);
const ADMIN_ALERT = stripQuotes(process.env.ADMIN_ALERT_EMAIL);
const FORCE_TO = stripQuotes(process.env.MAIL_FORCE_TO);
const BCC_ALL = stripQuotes(process.env.MAIL_BCC_ALL);

const CUSTOMER_BASE_URL =
  env(process.env.CUSTOMER_BASE_URL) ||
  env(process.env.NEXT_PUBLIC_CUSTOMER_BASE_URL) ||
  "https://kund.helsingbuss.se";

const ADMIN_BASE =
  env(process.env.NEXT_PUBLIC_LOGIN_BASE_URL) ||
  env(process.env.NEXT_PUBLIC_BASE_URL) ||
  "https://login.helsingbuss.se";

const BRAND = {
  name: "Helsingbuss",
  logoUrl: env(process.env.MAIL_BRAND_LOGO_URL) || "https://helsingbuss.se/assets/mail/logo-helsingbuss.png",
  primary: env(process.env.MAIL_BRAND_COLOR) || "#1D2937",
  primaryText: env(process.env.MAIL_BRAND_TEXT_COLOR) || "#ffffff",
  border: "#e5e7eb",
  muted: "#6b7280",
};

const isValidEmail = (e?: string | null) => !!e && /\S+@\S+\.\S+/.test(e);

function buildCustomerUrl(offerId: string, offerNumber: string) {
  const base = CUSTOMER_BASE_URL.replace(/\/+$/, "");
  const token = createOfferToken({ sub: offerId, no: offerNumber, role: "customer" }, "14d");
  return `${base}/offert/${encodeURIComponent(offerNumber)}?view=inkommen&t=${encodeURIComponent(token)}`;
}
function adminStartUrl() {
  return `${ADMIN_BASE.replace(/\/+$/, "")}/start`;
}

function wrap(inner: string, heading?: string, cta?: { href: string; label: string }) {
  const btn = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0 4px"><tr><td>
         <a href="${cta.href}" style="display:inline-block;background:${BRAND.primary};color:${BRAND.primaryText};text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">${cta.label}</a>
       </td></tr></table>`
    : "";

  const logo = BRAND.logoUrl ? `<div style="text-align:left;margin-bottom:12px"><img src="${BRAND.logoUrl}" alt="${BRAND.name}" height="36" style="display:block"/></div>` : "";

  return `
  <div style="background:#f7f7f8;padding:24px 0">
    <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="width:100%;max-width:640px;border-collapse:collapse">
      <tr><td style="padding:0 16px">
        ${logo}
        <div style="background:#fff;border:1px solid ${BRAND.border};border-radius:14px;padding:22px">
          ${heading ? `<h2 style="margin:0 0 6px 0;color:#111;font-size:20px">${heading}</h2>` : ""}
          <div style="margin-top:14px">${inner}</div>
          ${btn}
        </div>
        <div style="color:${BRAND.muted};font-size:12px;margin-top:12px;text-align:left">${BRAND.name} • Detta är ett automatiskt meddelande.</div>
      </td></tr>
    </table>
  </div>`;
}

export async function sendOfferMail(p: SendOfferParams) {
  if (!RESEND_KEY) throw new Error("RESEND_API_KEY saknas");
  const resend = new Resend(RESEND_KEY);

  // ADMIN → OFFERS_INBOX med CTA till /start
  const adminTo = OFFERS_INBOX || ADMIN_ALERT;
  if (adminTo) {
    const adminHtml = wrap(
      `<div><b>Ny offertförfrågan</b> (${p.offerNumber}) från ${p.customerName || "-"}${p.customerPhone ? `, ${p.customerPhone}` : ""}.<br/>Kundens e-post: ${p.customerEmail || "-"}</div>`,
      "Ny offertförfrågan",
      { href: adminStartUrl(), label: "Öppna Admin" }
    );
    const adminPayload: any = {
      from: /@helsingbuss\.se$/i.test(adminTo) ? FROM_FALLBACK : FROM_PRIMARY,
      to: adminTo,
      subject: `Ny offertförfrågan (${p.offerNumber}) från ${p.customerEmail || "kund"}`,
      html: adminHtml,
      text: `Ny offertförfrågan ${p.offerNumber}. Öppna: ${adminStartUrl()}`,
    };
    if (REPLY_TO) adminPayload.reply_to = REPLY_TO;
    await resend.emails.send(adminPayload);
  }

  // KUND → med knapp “Visa din offert”
  const toCustomer = (p.customerEmail || "").trim();
  if (isValidEmail(toCustomer)) {
    const url = buildCustomerUrl(p.offerId, p.offerNumber);
    const custHtml = wrap(
      `<div style="margin-bottom:8px"><b>Ärendenummer:</b> ${p.offerNumber}</div>
       <p style="margin:0 0 10px 0">Tack! Vi återkommer så snart vi gått igenom uppgifterna.</p>`,
      "Vi har mottagit din offertförfrågan",
      { href: url, label: "Visa din offert" }
    );

    const custPayload: any = {
      from: FROM_PRIMARY,
      to: FORCE_TO || toCustomer,
      subject: `Tack! Vi har mottagit din offertförfrågan (${p.offerNumber})`,
      html: custHtml,
      text: `Offert ${p.offerNumber}\n${url}`,
      bcc: FORCE_TO ? undefined : (OFFERS_INBOX ? [OFFERS_INBOX] : undefined),
    };
    if (REPLY_TO) custPayload.reply_to = REPLY_TO;
    if (BCC_ALL) custPayload.bcc = Array.isArray(custPayload.bcc) ? [...custPayload.bcc, BCC_ALL] : [BCC_ALL];
    await resend.emails.send(custPayload);
  }
  return { ok: true as const };
}
