// src/lib/sendMail.ts
import { Resend } from "resend";
import sg from "@sendgrid/mail";
import nodemailer from "nodemailer";

/** Inparametrar för utskick när en offert skapas */
export type SendOfferParams = {
  offerId: string;
  offerNumber: string;      // t.ex. HB251234
  customerEmail: string;

  customerName?: string | null;
  customerPhone?: string | null;

  from?: string | null;
  to?: string | null;
  date?: string | null;     // YYYY-MM-DD
  time?: string | null;     // HH:mm
  passengers?: number | null;
  via?: string | null;
  onboardContact?: string | null;

  return_from?: string | null;
  return_to?: string | null;
  return_date?: string | null;
  return_time?: string | null;

  notes?: string | null;
};

const FROM  = process.env.MAIL_FROM || "Helsingbuss <no-reply@helsingbuss.se>";
const ADMIN = process.env.ADMIN_ALERT_EMAIL || process.env.OFFERS_INBOX || "";

/** Välj provider (utan att kasta i onödan) */
function chooseProvider(): "resend" | "sendgrid" | "smtp" | "none" {
  if (process.env.RESEND_API_KEY)    return "resend";
  if (process.env.SENDGRID_API_KEY)  return "sendgrid";
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) return "smtp";
  return "none";
}

async function sendWithResend(to: string, subject: string, html: string, text: string) {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  await resend.emails.send({ from: FROM, to, subject, html, text });
}

async function sendWithSendgrid(to: string, subject: string, html: string, text: string) {
  sg.setApiKey(process.env.SENDGRID_API_KEY!);
  await sg.send({ from: FROM, to, subject, html, text });
}

async function sendWithSMTP(to: string, subject: string, html: string, text: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
  });
  await transporter.sendMail({ from: FROM, to, subject, html, text });
}

function safe(v?: string | null) { return (v ?? "").trim() || "—"; }

function tripBlock(p: SendOfferParams) {
  const out = [
    `<b>Från:</b> ${safe(p.from)}`,
    `<b>Till:</b> ${safe(p.to)}`,
    `<b>Datum:</b> ${safe(p.date)}`,
    `<b>Tid:</b> ${safe(p.time)}`,
    `<b>Passagerare:</b> ${p.passengers ?? "—"}`
  ];
  if (p.via) out.push(`<b>Via:</b> ${p.via}`);
  if (p.onboardContact) out.push(`<b>Kontakt ombord:</b> ${p.onboardContact}`);

  const ret = (p.return_from || p.return_to || p.return_date || p.return_time)
    ? [
        `<hr style="border:none;border-top:1px solid #eee;margin:12px 0" />`,
        `<div style="font-weight:600;margin-bottom:4px">Retur</div>`,
        `<b>Från:</b> ${safe(p.return_from)}`,
        `<b>Till:</b> ${safe(p.return_to)}`,
        `<b>Datum:</b> ${safe(p.return_date)}`,
        `<b>Tid:</b> ${safe(p.return_time)}`
      ].join("<br/>")
    : "";

  return `<div>${out.join("<br/>")}</div>${ret}`;
}

function renderAdminHtml(p: SendOfferParams) {
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; color:#111">
    <h2 style="margin:0 0 8px 0">Ny offertförfrågan</h2>
    <div><b>Offert:</b> ${safe(p.offerNumber)}</div>
    <div><b>Beställare:</b> ${safe(p.customerName)}</div>
    <div><b>E-post:</b> ${safe(p.customerEmail)}</div>
    <div><b>Telefon:</b> ${safe(p.customerPhone)}</div>
    <hr style="border:none;border-top:1px solid #eee;margin:12px 0" />
    <div style="font-weight:600;margin-bottom:4px">Reseinformation</div>
    ${tripBlock(p)}
    ${p.notes ? `<hr style="border:none;border-top:1px solid #eee;margin:12px 0" />
      <div style="font-weight:600;margin-bottom:4px">Övrigt</div><div>${safe(p.notes)}</div>` : ""}
  </div>`;
}

function renderCustomerHtml(p: SendOfferParams) {
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; color:#111">
    <h2 style="margin:0 0 8px 0">Tack! Vi har mottagit din offertförfrågan</h2>
    <div><b>Ärendenummer:</b> ${safe(p.offerNumber)}</div>
    <p>Vi återkommer så snart vi har gått igenom uppgifterna.</p>
    <div style="font-weight:600;margin:12px 0 4px">Sammanfattning</div>
    ${tripBlock(p)}
    ${p.notes ? `<div style="margin-top:8px"><b>Övrig information:</b><br/>${safe(p.notes)}</div>` : ""}
  </div>`;
}

function renderText(p: SendOfferParams) {
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
    lines.push("", "Retur",
      `Från: ${p.return_from || "-"}`,
      `Till: ${p.return_to || "-"}`,
      `Datum: ${p.return_date || "-"}`,
      `Tid: ${p.return_time || "-"}`);
  }
  if (p.notes) lines.push("", "Övrigt", p.notes);
  return lines.join("\n");
}

/** Skicka admin + kund. Faller snällt tillbaka om ingen provider finns. */
export async function sendOfferMail(p: SendOfferParams) {
  const provider = chooseProvider();
  const adminSubject    = `Ny offertförfrågan ${p.offerNumber}`;
  const customerSubject = `Tack! Vi har mottagit din offertförfrågan (${p.offerNumber})`;
  const htmlAdmin    = renderAdminHtml(p);
  const htmlCustomer = renderCustomerHtml(p);
  const text = renderText(p);

  if (provider === "none") {
    console.warn("[sendMail] Inga e-postnycklar satta. Skippar utskick.", {
      wantAdmin: !!ADMIN, customerEmail: p.customerEmail
    });
    return { ok: false as const, provider: "none" as const };
  }

  const sender =
    provider === "resend"   ? sendWithResend   :
    provider === "sendgrid" ? sendWithSendgrid :
                              sendWithSMTP;

  // 1) Admin-kopia (om satt)
  if (ADMIN) {
    await sender(ADMIN, adminSubject, htmlAdmin, text);
  }

  // 2) Kund
  if (p.customerEmail && /\S+@\S+\.\S+/.test(p.customerEmail)) {
    await sender(p.customerEmail, customerSubject, htmlCustomer, text);
  }

  return { ok: true as const, provider };
}
