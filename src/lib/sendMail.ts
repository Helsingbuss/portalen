// src/lib/sendMail.ts

import { Resend } from "resend";

/** ========= Konfiguration ========= */
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM_ADMIN =
  process.env.RESEND_FROM_ADMIN || "Helsingbuss <offert@helsingbuss.se>";
const FROM_INFO =
  process.env.RESEND_FROM_INFO || "Helsingbuss <info@helsingbuss.se>";
const ADMIN_INBOX =
  process.env.OFFER_INBOX_TO || "offert@helsingbuss.se";

// Admin-portalen (bara för interna mail)
const LOGIN_URL =
  (process.env.NEXT_PUBLIC_LOGIN_BASE_URL ||
    "https://login.helsingbuss.se") + "/start";

const resend = new Resend(RESEND_API_KEY);

/** ========= Hjälpare ========= */

/** Bygger kundlänk till offerten: https://kund.helsingbuss.se/offert/HB26002 */
function customerOfferLink(offerNumber: string, fallback?: string) {
  const trimmed = (offerNumber || "").trim();
  if (!trimmed && fallback) return fallback;

  const base =
    process.env.NEXT_PUBLIC_CUSTOMER_BASE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://kund.helsingbuss.se";

  const root = base.replace(/\/$/, "");
  if (!trimmed) return root; // sista fallback

  return `${root}/offert/${encodeURIComponent(trimmed)}`;
}

/** ========= Typer ========= */
export type SendOfferParams = {
  offerId: string;
  offerNumber: string;

  customerEmail?: string;
  customerName?: string;

  from?: string;
  to?: string;
  date?: string;
  time?: string;
  via?: string | null;
  stop?: string | null;
  passengers?: number;

  return_from?: string | null;
  return_to?: string | null;
  return_date?: string | null;
  return_time?: string | null;

  notes?: string | null;
  subject?: string;

  /** Full URL till offerten för kunden (valfritt – genereras annars) */
  link?: string;
};

export type CustomerReceiptParams = {
  /** Mottagarens e-post (kunden) */
  to: string;
  offerNumber: string;

  /** (valfritt) egen länk – annars byggs /offert/HBxxxxx */
  link?: string;

  /** Resöversikt som visas i mailet */
  from?: string;
  toPlace?: string;
  date?: string;
  time?: string;
  passengers?: number;
};

/** ========= Templates (HTML) ========= */

function layout(bodyHtml: string) {
  return `<!doctype html>
<html lang="sv">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width" />
<title>Helsingbuss</title>
</head>
<body style="margin:0;background:#f5f4f0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1a1a1a">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f4f0;padding:24px 0">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.06);overflow:hidden">
          <tr>
            <td style="padding:20px 24px;border-bottom:1px solid #eee">
              <img alt="Helsingbuss" src="https://helsingbuss.se/logo-email.png" style="height:20px;vertical-align:middle" />
            </td>
          </tr>
          <tr>
            <td style="padding:24px">${bodyHtml}</td>
          </tr>
          <tr>
            <td style="padding:16px 24px;border-top:1px solid #eee;color:#68737d;font-size:12px">
              Helsingbuss • Detta är ett automatiskt meddelande – svara gärna om du vill komplettera något.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Gemensam knapp: "Visa din offert" */
function renderOfferButton(link: string) {
  return `
  <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:20px">
    <tr>
      <td style="background:#194C66;color:#fff;padding:12px 18px;border-radius:8px">
        <a href="${link}" style="color:#fff;text-decoration:none;font-weight:600;display:inline-block">Visa din offert</a>
      </td>
    </tr>
  </table>`;
}

/** Kundens kvittens (när de skickat in offertförfrågan) */
function renderCustomerReceiptHTML(p: CustomerReceiptParams) {
  // Vi struntar i ev. gammal token-länk och bygger alltid /offert/HBxxxxx
  const link = customerOfferLink(p.offerNumber, p.link);
  const btn = renderOfferButton(link);

  const summary = `
  <h1 style="margin:0 0 10px 0;font-size:22px">Vi har mottagit din offertförfrågan</h1>
  <p style="margin:0 0 14px 0"><strong>Ärendenummer:</strong> ${p.offerNumber}</p>
  <p style="margin:0 0 18px 0">Tack! Vi återkommer så snart vi har gått igenom uppgifterna.</p>

  <div style="margin:18px 0 4px 0;font-weight:700">Sammanfattning</div>
  <table role="presentation" cellspacing="0" cellpadding="0" style="font-size:14px">
    <tr><td style="padding:4px 12px 4px 0;color:#68737d">Från</td><td>${p.from ?? "—"}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#68737d">Till</td><td>${p.toPlace ?? "—"}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#68737d">Datum</td><td>${p.date ?? "—"}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#68737d">Tid</td><td>${p.time ?? "—"}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#68737d">Passagerare</td><td>${p.passengers ?? "—"}</td></tr>
  </table>
  ${btn}`;

  return layout(summary);
}

/** Admin: “Ny offertförfrågan inkommen” (till offert@) */
function renderAdminNewOfferHTML(p: SendOfferParams) {
  const openBtn = `
  <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:20px">
    <tr>
      <td style="background:#194C66;color:#fff;padding:12px 18px;border-radius:8px">
        <a href="${LOGIN_URL}" style="color:#fff;text-decoration:none;font-weight:600;display:inline-block">Öppna i portalen</a>
      </td>
    </tr>
  </table>`;

  const body = `
  <h1 style="margin:0 0 10px 0;font-size:22px">Ny offertförfrågan inkommen</h1>
  <p style="margin:0 0 14px 0"><strong>Offert-ID:</strong> ${p.offerNumber}</p>

  <div style="margin:0 0 10px 0;font-weight:700">Beställare</div>
  <table role="presentation" cellspacing="0" cellpadding="0" style="font-size:14px;margin:0 0 16px 0">
    <tr><td style="padding:4px 12px 4px 0;color:#68737d">Kontakt</td><td>${p.customerName ?? "—"}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#68737d">E-post</td><td>${p.customerEmail ?? "—"}</td></tr>
  </table>

  <div style="margin:0 0 10px 0;font-weight:700">Reseinformation</div>
  <table role="presentation" cellspacing="0" cellpadding="0" style="font-size:14px">
    <tr><td style="padding:4px 12px 4px 0;color:#68737d">Från</td><td>${p.from ?? "—"}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#68737d">Till</td><td>${p.to ?? "—"}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#68737d">Datum</td><td>${p.date ?? "—"}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#68737d">Tid</td><td>${p.time ?? "—"}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#68737d">Passagerare</td><td>${p.passengers ?? "—"}</td></tr>
  </table>
  ${openBtn}`;

  return layout(body);
}

/** Kund: prisförslag / besvarad offert */
function renderCustomerPriceProposalHTML(p: SendOfferParams & { link: string }) {
  const hasReturn =
    !!p.return_from || !!p.return_to || !!p.return_date || !!p.return_time;

  const btn = renderOfferButton(p.link);
  const introName = p.customerName ? `Hej ${p.customerName}!` : "Hej!";

  const rowsOut = `
  <tr><td style="padding:4px 12px 4px 0;color:#68737d">Från</td><td>${p.from ?? "—"}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#68737d">Till</td><td>${p.to ?? "—"}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#68737d">Datum</td><td>${p.date ?? "—"}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#68737d">Tid</td><td>${p.time ?? "—"}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#68737d">Passagerare</td><td>${p.passengers ?? "—"}</td></tr>`;

  const rowsRet = hasReturn
    ? `
  <tr><td colspan="2" style="padding:10px 0 4px 0;font-weight:700">Återresa</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#68737d">Från</td><td>${p.return_from ?? "—"}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#68737d">Till</td><td>${p.return_to ?? "—"}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#68737d">Datum</td><td>${p.return_date ?? "—"}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#68737d">Tid</td><td>${p.return_time ?? "—"}</td></tr>`
    : "";

  const notes = p.notes
    ? `<p style="margin:18px 0 0 0;"><strong>Övrig information:</strong><br/>${(p.notes || "")
        .toString()
        .replace(/\n/g, "<br/>")}</p>`
    : "";

  const body = `
  <h1 style="margin:0 0 10px 0;font-size:22px">Prisförslag för din resa</h1>
  <p style="margin:0 0 10px 0;">${introName}</p>
  <p style="margin:0 0 14px 0;">
    Här kommer vårt prisförslag baserat på uppgifterna i din offertförfrågan
    med ärendenummer <strong>${p.offerNumber}</strong>. Kontrollera gärna att
    uppgifterna stämmer. Om du vill boka resan kan du svara direkt på detta
    mail eller kontakta oss på telefon.
  </p>

  <div style="margin:18px 0 6px 0;font-weight:700">Sammanfattning av resan</div>
  <table role="presentation" cellspacing="0" cellpadding="0" style="font-size:14px">
    ${rowsOut}
    ${rowsRet}
  </table>

  ${btn}

  ${notes}

  <p style="margin:18px 0 0 0;">
    Har du frågor, vill göra justeringar eller vill gå vidare till bokning?
    Svara på detta mail eller ring oss på vardagar kl. 08:00–17:00:
    <strong>010–405&nbsp;38&nbsp;38</strong>.<br/>
    Vid akuta ärenden når du vår jour på <strong>010–777&nbsp;21&nbsp;58</strong>.
  </p>

  <p style="margin:16px 0 0 0;">Vänliga hälsningar<br/>Helsingbuss</p>`;

  return layout(body);
}

/** ========= Sändare ========= */

export async function sendOfferMail(p: SendOfferParams) {
  if (!RESEND_API_KEY) {
    console.error("[sendOfferMail] RESEND_API_KEY saknas – skickar inget mail");
    return;
  }

  const subject =
    p.subject || `Ny offertförfrågan inkommen – ${p.offerNumber}`;
  const isPriceProposal = subject.toLowerCase().includes("prisförslag");

  // MODE 1: Prisförslag till kund (besvarad offert)
  if (isPriceProposal && p.customerEmail) {
    const link = p.link || customerOfferLink(p.offerNumber);

    const html = renderCustomerPriceProposalHTML({ ...p, link });

    await resend.emails.send({
      from: FROM_INFO,
      to: p.customerEmail,
      subject,
      html,
    });

    return;
  }

  // MODE 2: Ny offertförfrågan till admin (offert@)
  const html = renderAdminNewOfferHTML(p);

  await resend.emails.send({
    from: FROM_ADMIN,
    to: ADMIN_INBOX,
    subject,
    html,
  });
}

export async function sendCustomerReceipt(p: CustomerReceiptParams) {
  if (!RESEND_API_KEY) {
    console.error(
      "[sendCustomerReceipt] RESEND_API_KEY saknas – skickar inget mail"
    );
  }

  if (!p.to) {
    console.error(
      "[sendCustomerReceipt] Ingen mottagaradress (p.to) – skickar inget mail",
      p
    );
    return;
  }

  const subject = `Vi har mottagit din offertförfrågan – ${p.offerNumber}`;
  const html = renderCustomerReceiptHTML(p);

  try {
    const result = await resend.emails.send({
      from: FROM_INFO,
      to: p.to,
      subject,
      html,
    });

    console.log(
      "[sendCustomerReceipt] skickat OK",
      "to:",
      p.to,
      "result:",
      (result as any)?.id || "ok"
    );
  } catch (err: any) {
    console.error("[sendCustomerReceipt] Resend-fel:", err?.message || err);
    throw err;
  }
}
