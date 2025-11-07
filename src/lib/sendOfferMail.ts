import { Resend } from "resend";
import sg from "@sendgrid/mail";
import nodemailer from "nodemailer";
import { signOfferToken } from "@/lib/offerJwt"; // måste finnas enligt tidigare steg

/** Inparametrar för utskick när en offert skapas */
export type SendOfferParams = {
  // Obligatoriskt
  offerId: string;
  offerNumber: string; // t.ex. HB251234
  customerEmail: string;

  // Valfritt men rekommenderat
  customerName?: string | null;
  customerPhone?: string | null;

  // Primär sträcka
  from?: string | null;
  to?: string | null;
  date?: string | null; // YYYY-MM-DD
  time?: string | null; // HH:mm
  passengers?: number | null;
  via?: string | null;
  onboardContact?: string | null;

  // Retur (om finns)
  return_from?: string | null;
  return_to?: string | null;
  return_date?: string | null;
  return_time?: string | null;

  // Övrigt
  notes?: string | null;
};

/** Avsändare och admin från env */
const FROM = process.env.MAIL_FROM || "Helsingbuss <no-reply@helsingbuss.se>";
const ADMIN = process.env.ADMIN_ALERT_EMAIL || "";

/** Bas-URL till kundportalen – ingen localhost i utskick */
function customerBaseUrl() {
  const url =
    process.env.NEXT_PUBLIC_CUSTOMER_BASE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://kund.helsingbuss.se";
  return url.replace(/\/+$/, "");
}

/** Säkra kundlänken med kort JWT-token */
function buildSecureOfferLink(offerId: string) {
  // giltighet: 30 dagar (valfritt att justera)
  const t = signOfferToken({ offer_id: offerId, expMinutes: 60 * 24 * 30 });
  return `${customerBaseUrl()}/offert/${encodeURIComponent(offerId)}?t=${encodeURIComponent(t)}`;
}

/** === Leverantörsväljare (Resend → SendGrid → SMTP) === */
function pickProvider() {
  const haveResend = !!process.env.RESEND_API_KEY;
  const haveSendgrid = !!process.env.SENDGRID_API_KEY;
  const haveSmtp =
    !!process.env.SMTP_HOST &&
    !!process.env.SMTP_PORT &&
    !!process.env.SMTP_USER &&
    !!process.env.SMTP_PASS;

  if (haveResend) return "resend" as const;
  if (haveSendgrid) return "sendgrid" as const;
  if (haveSmtp) return "smtp" as const;
  throw new Error(
    "Ingen mejlkonfiguration hittades. Sätt RESEND_API_KEY eller SENDGRID_API_KEY eller SMTP_* i miljövariabler."
  );
}

/** === Avsändare per leverantör === */
async function sendWithResend(args: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  await resend.emails.send({
    from: FROM,
    to: args.to,
    subject: args.subject,
    html: args.html,
    text: args.text,
  });
}

async function sendWithSendgrid(args: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  sg.setApiKey(process.env.SENDGRID_API_KEY!);
  await sg.send({
    from: FROM,
    to: args.to,
    subject: args.subject,
    html: args.html,
    text: args.text,
  });
}

async function sendWithSMTP(args: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
  });

  await transporter.sendMail({
    from: FROM,
    to: args.to,
    subject: args.subject,
    html: args.html,
    text: args.text,
  });
}

/** === Template helpers (svenska) === */
function safe(v?: string | null) {
  return (v ?? "").trim() || "—";
}

function tripBlock(p: SendOfferParams) {
  const first =
    `<b>Från:</b> ${safe(p.from)}<br/>` +
    `<b>Till:</b> ${safe(p.to)}<br/>` +
    `<b>Datum:</b> ${safe(p.date)}<br/>` +
    `<b>Tid:</b> ${safe(p.time)}<br/>` +
    `<b>Passagerare:</b> ${p.passengers ?? "—"}<br/>` +
    (p.via ? `<b>Via:</b> ${p.via}<br/>` : "") +
    (p.onboardContact ? `<b>Kontakt ombord:</b> ${p.onboardContact}<br/>` : "");

  const ret =
    p.return_from || p.return_to || p.return_date || p.return_time
      ? `<hr style="border:none;border-top:1px solid #eee;margin:12px 0" />
         <div style="font-weight:600;margin-bottom:4px">Retur</div>
         <b>Från:</b> ${safe(p.return_from)}<br/>
         <b>Till:</b> ${safe(p.return_to)}<br/>
         <b>Datum:</b> ${safe(p.return_date)}<br/>
         <b>Tid:</b> ${safe(p.return_time)}<br/>`
      : "";

  return `<div>${first}</div>${ret}`;
}

function ctaButton(href: string, label: string) {
  return `
  <div style="margin:18px 0">
    <a href="${href}" target="_blank" rel="noopener"
       style="display:inline-block;padding:10px 16px;border-radius:999px;
              background:#194C66;color:#fff;text-decoration:none;font-weight:600">
      ${label}
    </a>
  </div>`;
}

function renderAdminHtml(p: SendOfferParams) {
  const link = buildSecureOfferLink(p.offerId);
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; color:#111">
    <h2 style="margin:0 0 8px 0">Ny offertförfrågan</h2>
    <div><b>Offert-ID:</b> ${safe(p.offerNumber)}</div>
    <div><b>Beställare:</b> ${safe(p.customerName)}</div>
    <div><b>E-post:</b> ${safe(p.customerEmail)}</div>
    <div><b>Telefon:</b> ${safe(p.customerPhone)}</div>

    <hr style="border:none;border-top:1px solid #eee;margin:12px 0" />

    <div style="font-weight:600;margin-bottom:4px">Reseinformation</div>
    ${tripBlock(p)}

    ${ctaButton(link, "Öppna offerten")}

    <hr style="border:none;border-top:1px solid #eee;margin:16px 0" />
    <div style="color:#6b7280;font-size:12px">
      Denna notifiering skickades automatiskt från Helsingbuss Portal.
    </div>
  </div>`;
}

function renderCustomerHtml(p: SendOfferParams) {
  const link = buildSecureOfferLink(p.offerId);
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; color:#111">
    <h2 style="margin:0 0 8px 0">Tack! Vi har mottagit din offertförfrågan</h2>
    <div><b>Ärendenummer:</b> ${safe(p.offerNumber)}</div>

    <p>Vi återkommer så snart vi har gått igenom uppgifterna.</p>

    <div style="font-weight:600;margin:12px 0 4px">Sammanfattning</div>
    ${tripBlock(p)}

    ${ctaButton(link, "Visa din offert")}

    <hr style="border:none;border-top:1px solid #eee;margin:16px 0" />
    <div style="color:#6b7280;font-size:12px">
      Helsingbuss • Detta är ett automatiskt bekräftelsemejl – svara gärna om du vill komplettera något.
    </div>
  </div>`;
}

function renderText(p: SendOfferParams) {
  const link = buildSecureOfferLink(p.offerId);
  const lines = [
    `Offert: ${p.offerNumber}`,
    `Beställare: ${p.customerName || "-"}`,
    `E-post: ${p.customerEmail}`,
    `Telefon: ${p.customerPhone || "-"}`,
    "",
    "Reseinformation",
    `Från: ${p.from || "-"}`,
    `Till: ${p.to || "-"}`,
    `Datum: ${p.date || "-"}`,
    `Tid: ${p.time || "-"}`,
    `Passagerare: ${p.passengers ?? "-"}`,
  ];
  if (p.via) lines.push(`Via: ${p.via}`);
  if (p.onboardContact) lines.push(`Kontakt ombord: ${p.onboardContact}`);
  if (p.return_from || p.return_to || p.return_date || p.return_time) {
    lines.push(
      "",
      "Retur",
      `Från: ${p.return_from || "-"}`,
      `Till: ${p.return_to || "-"}`,
      `Datum: ${p.return_date || "-"}`,
      `Tid: ${p.return_time || "-"}`
    );
  }
  lines.push("", `Visa offerten: ${link}`);
  return lines.join("\n");
}

/** Skicka två mejl: till admin och till kund (med fallback-kedja) */
export async function sendOfferMail(p: SendOfferParams) {
  const provider = pickProvider();
  const send =
    provider === "resend"
      ? sendWithResend
      : provider === "sendgrid"
      ? sendWithSendgrid
      : sendWithSMTP;

  const adminSubject = `Ny offertförfrågan ${p.offerNumber}`;
  const customerSubject = `Tack! Vi har mottagit din offertförfrågan (${p.offerNumber})`;

  const htmlAdmin = renderAdminHtml(p);
  const htmlCustomer = renderCustomerHtml(p);
  const text = renderText(p);

  // 1) Admin
  if (ADMIN) {
    await send({
      to: ADMIN,
      subject: adminSubject,
      html: htmlAdmin,
      text,
    });
  }

  // 2) Kund
  if (p.customerEmail && /\S+@\S+\.\S+/.test(p.customerEmail)) {
    await send({
      to: p.customerEmail,
      subject: customerSubject,
      html: htmlCustomer,
      text,
    });
  }

  return { ok: true as const, provider };
}
