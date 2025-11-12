// src/lib/sendBookingMail.ts
import { Resend } from "resend";
import sg from "@sendgrid/mail";
import nodemailer from "nodemailer";

type LegInfo = {
  date?: string | null;
  time?: string | null;
  from?: string | null;
  to?: string | null;
};

export type SendBookingMailParams = {
  to: string;                    // kundens e-post
  bookingNumber: string;         // BK25XXXX
  passengers?: number | null;
  out?: LegInfo;                 // utresa
  ret?: LegInfo | null;          // retur (om finns)
  baseUrl?: string | null;       // valfritt; auto-deriveras om ej satt
};

function resolveBaseUrl(explicit?: string | null) {
  if (explicit) return explicit.replace(/\/+$/, "");
  const envUrl =
    process.env.PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    "";
  if (!envUrl) return "http://localhost:3000";
  const hasProtocol = /^https?:\/\//i.test(envUrl);
  return (hasProtocol ? envUrl : `https://${envUrl}`).replace(/\/+$/, "");
}

function htmlEscape(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c] as string));
}

function renderLines(out?: LegInfo | null, ret?: LegInfo | null, pax?: number | null) {
  const outLine = out
    ? `${out.date ?? "—"} ${out.time ?? ""} — ${out.from ?? "—"} → ${out.to ?? "—"}`
    : "—";
  const retLine = ret
    ? `${ret.date ?? "—"} ${ret.time ?? ""} — ${ret.from ?? "—"} → ${ret.to ?? "—"}`
    : null;

  return { outLine, retLine, paxText: Number.isFinite(pax ?? NaN) ? String(pax) : "—" };
}

function buildHtml({ bookingNumber, out, ret, passengers, link }: { bookingNumber: string; out?: LegInfo | null; ret?: LegInfo | null; passengers?: number | null; link: string }) {
  const { outLine, retLine, paxText } = renderLines(out, ret, passengers);

  const body = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#194C66;line-height:1.45">
    <h2 style="margin:0 0 8px 0">Bokning (${htmlEscape(bookingNumber)})</h2>
    <p style="margin:0 0 16px 0;">Tack för er bokning!</p>

    <p style="margin:0 0 12px 0">
      <a href="${link}" style="color:#194C66;text-decoration:underline">Vänligen klicka här för att se vad som har registrerats (${htmlEscape(bookingNumber)}).</a>
    </p>

    <div style="background:#f5f7fa;border:1px solid #e5eef3;border-radius:12px;padding:12px;margin:12px 0">
      <div><strong>Ordernummer (Boknings ID):</strong> ${htmlEscape(bookingNumber)}</div>
      <div><strong>Passagerare:</strong> ${htmlEscape(paxText)}</div>
      <div style="margin-top:6px"><strong>Utresa:</strong><br/>${htmlEscape(outLine)}</div>
      ${retLine ? `<div style="margin-top:6px"><strong>Retur:</strong><br/>${htmlEscape(retLine)}</div>` : ""}
    </div>

    <p style="margin:12px 0 0 0;">Fakturan kommer att skickas ut efter utfört uppdrag.</p>
    <p style="margin:8px 0 0 0;">Kontrollera gärna att bokningen stämmer enligt era önskemål.</p>

    <p style="margin:12px 0 0 0;">
      Frågor om din resa? Ring vårt Kundteam under vardagar 8–17: <strong>010-405&nbsp;38&nbsp;38</strong>,
      eller besvara detta mail.<br/>
      Vid akuta trafikärenden efter kontorstid når du vår jour på <strong>010-777&nbsp;21&nbsp;58</strong>.
    </p>

    <p style="margin:16px 0 0 0;">Vänliga hälsningar<br/>Helsingbuss Kundteam</p>
  </div>`;
  return body;
}

function buildText({ bookingNumber, out, ret, passengers, link }: { bookingNumber: string; out?: LegInfo | null; ret?: LegInfo | null; passengers?: number | null; link: string }) {
  const { outLine, retLine, paxText } = renderLines(out, ret, passengers);
  return [
    `Bokning (${bookingNumber})`,
    `Tack för er bokning!`,
    ``,
    `Se bokningsdetaljer: ${link}`,
    ``,
    `Ordernummer (Boknings ID): ${bookingNumber}`,
    `Passagerare: ${paxText}`,
    `Utresa: ${outLine}`,
    retLine ? `Retur: ${retLine}` : ``,
    ``,
    `Fakturan kommer att skickas ut efter utfört uppdrag.`,
    `Kontrollera gärna att bokningen stämmer enligt era önskemål.`,
    ``,
    `Frågor om din resa?`,
    `Kundteam vardagar 8–17: 010-405 38 38, eller besvara detta mail.`,
    `Jour efter kontorstid: 010-777 21 58.`,
    ``,
    `Vänliga hälsningar`,
    `Helsingbuss Kundteam`,
  ].filter(Boolean).join("\n");
}

export async function sendBookingMail(params: SendBookingMailParams) {
  const from = process.env.MAIL_FROM || "Helsingbuss <no-reply@helsingbuss.se>";
  const base = resolveBaseUrl(params.baseUrl);
  const link = `${base}/bokning/${encodeURIComponent(params.bookingNumber)}`;
  const subject = `Bokning (${params.bookingNumber})`;
  const html = buildHtml({ bookingNumber: params.bookingNumber, out: params.out, ret: params.ret || null, passengers: params.passengers, link });
  const text = buildText({ bookingNumber: params.bookingNumber, out: params.out, ret: params.ret || null, passengers: params.passengers, link });

  // 1) Resend
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({ from, to: params.to, subject, html, text, bcc: process.env.MAIL_BOOKINGS_BCC || undefined });
      return { ok: true, provider: "resend" as const };
    } catch (e) { /* fall through */ }
  }

  // 2) SendGrid
  if (process.env.SENDGRID_API_KEY) {
    try {
      sg.setApiKey(process.env.SENDGRID_API_KEY);
      await sg.send({
        from,
        to: params.to,
        bcc: process.env.MAIL_BOOKINGS_BCC || undefined,
        subject,
        html,
        text,
      } as any);
      return { ok: true, provider: "sendgrid" as const };
    } catch (e) { /* fall through */ }
  }

  // 3) SMTP (nodemailer)
  if (process.env.SMTP_HOST) {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
      auth: (process.env.SMTP_USER && process.env.SMTP_PASS)
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    } as any);

    await transport.sendMail({
      from,
      to: params.to,
      bcc: process.env.MAIL_BOOKINGS_BCC || undefined,
      subject,
      html,
      text,
    });
    return { ok: true, provider: "smtp" as const };
  }

  return { ok: false, error: "No email provider configured" as const };
}
