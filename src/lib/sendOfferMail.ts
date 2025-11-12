import { Resend } from "resend";

/** Publika parametrar för offertmejl */
export type SendOfferParams = {
  offerId: string;
  offerNumber: string;       // t.ex. HB25007
  customerEmail: string;

  customerName?: string | null;
  customerPhone?: string | null;

  from?: string | null;
  to?: string | null;
  date?: string | null;      // YYYY-MM-DD
  time?: string | null;      // HH:mm
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
const RESEND_KEY   = env(process.env.RESEND_API_KEY);

// Avsändare & mottagare
const FROM_PRIMARY  = env(process.env.MAIL_FROM) || env(process.env.EMAIL_FROM) || "Helsingbuss <noreply@helsingbuss.se>";
const FROM_FALLBACK = env(process.env.RESEND_FROM_FALLBACK) || "Helsingbuss <onboarding@resend.dev>";
const REPLY_TO      = env(process.env.EMAIL_REPLY_TO);
const ADMIN         = env(process.env.ADMIN_ALERT_EMAIL);
const OFFERS_INBOX  = env(process.env.OFFERS_INBOX);
const FORCE_TO      = env(process.env.MAIL_FORCE_TO); // test: tvinga mottagare
const BCC_ALL       = env(process.env.MAIL_BCC_ALL);  // valfri global BCC (t.ex. loggadress)

// Länkar/branding
const CUSTOMER_BASE_URL =
  env(process.env.CUSTOMER_BASE_URL) ||
  env(process.env.NEXT_PUBLIC_CUSTOMER_BASE_URL) ||
  env(process.env.NEXT_PUBLIC_BASE_URL) ||
  "https://kund.helsingbuss.se";

const BRAND = {
  name: "Helsingbuss",
  logoUrl: env(process.env.MAIL_BRAND_LOGO_URL) || "https://helsingbuss.se/assets/mail/logo-helsingbuss.png",
  primary: env(process.env.MAIL_BRAND_COLOR) || "#1D2937",
  primaryText: env(process.env.MAIL_BRAND_TEXT_COLOR) || "#ffffff",
  border: "#e5e7eb",
  muted: "#6b7280",
  link: env(process.env.MAIL_LINK_COLOR) || "#1D2937",
};

function safe(v?: string | null) { return (v ?? "").trim() || "—"; }

function buildPreviewUrl(offerNumber: string) {
  const base = CUSTOMER_BASE_URL.replace(/\/+$/, "");
  return `${base}/offert/${encodeURIComponent(offerNumber)}?view=inkommen`;
}

function tripBlockHtml(p: SendOfferParams) {
  const rows: string[] = [];
  rows.push(row("Från", p.from));
  rows.push(row("Till", p.to));
  rows.push(row("Datum", p.date));
  rows.push(row("Tid", p.time));
  rows.push(row("Passagerare", (p.passengers ?? "—").toString()));
  if (p.via) rows.push(row("Via", p.via));
  if (p.onboardContact) rows.push(row("Kontakt ombord", p.onboardContact));

  const ret: string[] = [];
  if (p.return_from || p.return_to || p.return_date || p.return_time) {
    ret.push(
      `<div style="font-weight:600;margin:14px 0 6px">Retur</div>`,
      row("Från", p.return_from),
      row("Till", p.return_to),
      row("Datum", p.return_date),
      row("Tid", p.return_time)
    );
  }

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">
      <tbody>
        ${rows.join("")}
        ${ret.join("")}
      </tbody>
    </table>
  `;

  function row(label: string, value?: string | null) {
    return `
      <tr>
        <td style="padding:6px 0;color:#111;font-weight:600;width:160px;vertical-align:top">${label}</td>
        <td style="padding:6px 0;color:#111">${safe(value)}</td>
      </tr>
    `;
  }
}

function renderWrapper(inner: string, heading?: string, sub?: string, cta?: { href: string; label: string }) {
  const ctaBtn = cta ? `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0 4px">
      <tr>
        <td>
          <a href="${cta.href}"
             style="display:inline-block;background:${BRAND.primary};color:${BRAND.primaryText};text-decoration:none;
                    padding:12px 18px;border-radius:10px;font-weight:700">
            ${cta.label}
          </a>
        </td>
      </tr>
    </table>
  ` : "";

  const logo = BRAND.logoUrl ? `
    <div style="text-align:left;margin-bottom:12px">
      <img src="${BRAND.logoUrl}" alt="${BRAND.name}" height="36" style="display:block"/>
    </div>` : "";

  const subline = sub ? `<div style="color:${BRAND.muted};margin-top:6px">${sub}</div>` : "";

  return `
  <div style="background:#f7f7f8;padding:24px 0">
    <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="width:100%;max-width:640px;border-collapse:collapse">
      <tr>
        <td style="padding:0 16px">
          ${logo}
          <div style="background:#fff;border:1px solid ${BRAND.border};border-radius:14px;padding:22px">
            ${heading ? `<h2 style="margin:0 0 6px 0;color:#111;font-size:20px">${heading}</h2>` : ""}
            ${subline}
            <div style="margin-top:14px">${inner}</div>
            ${ctaBtn}
          </div>
          <div style="color:${BRAND.muted};font-size:12px;margin-top:12px;text-align:left">
            ${BRAND.name} • Detta är ett automatiskt meddelande – svara gärna om du vill komplettera något.
          </div>
        </td>
      </tr>
    </table>
  </div>`;
}

function renderAdminHtml(p: SendOfferParams) {
  const inner = `
    <div style="margin:0 0 12px 0"><b>Offert-ID:</b> ${safe(p.offerNumber)}</div>
    <div><b>Beställare:</b> ${safe(p.customerName)}<br/>
         <b>E-post:</b> ${safe(p.customerEmail)}<br/>
         <b>Telefon:</b> ${safe(p.customerPhone)}</div>
    <hr style="border:none;border-top:1px solid ${BRAND.border};margin:16px 0"/>
    <div style="font-weight:600;margin-bottom:6px">Reseinformation</div>
    ${tripBlockHtml(p)}
    ${p.notes ? `
      <hr style="border:none;border-top:1px solid ${BRAND.border};margin:16px 0"/>
      <div style="font-weight:600;margin-bottom:6px">Övrigt</div>
      <div>${safe(p.notes)}</div>
    ` : ""}
  `;
  const cta = { href: buildPreviewUrl(p.offerNumber), label: "Öppna i portalen" };
  return renderWrapper(inner, "Ny offertförfrågan", undefined, cta);
}

function renderCustomerHtml(p: SendOfferParams) {
  const inner = `
    <div style="margin-bottom:8px"><b>Ärendenummer:</b> ${safe(p.offerNumber)}</div>
    <p style="margin:0 0 10px 0">Tack! Vi återkommer så snart vi har gått igenom uppgifterna.</p>
    <div style="font-weight:600;margin:12px 0 6px">Sammanfattning</div>
    ${tripBlockHtml(p)}
    ${p.notes ? `
      <div style="margin-top:8px"><b>Övrig information:</b><br/>${safe(p.notes)}</div>
    ` : ""}
  `;
  const cta = { href: buildPreviewUrl(p.offerNumber), label: "Visa din offert" };
  return renderWrapper(inner, "Vi har mottagit din offertförfrågan", undefined, cta);
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
    lines.push(
      "",
      "Retur",
      `Från: ${p.return_from || "-"}`,
      `Till: ${p.return_to || "-"}`,
      `Datum: ${p.return_date || "-"}`,
      `Tid: ${p.return_time || "-"}`
    );
  }
  if (p.notes) {
    lines.push("", "Övrigt", p.notes);
  }
  lines.push("", buildPreviewUrl(p.offerNumber));
  return lines.join("\n");
}

/** Robust Resend-sändning med fallback-avsändare och tydlig loggning */
async function sendViaResend(args: {
  to: string;
  subject: string;
  html: string;
  text: string;
  bcc?: string[];
}) {
  if (!RESEND_KEY) throw new Error("RESEND_API_KEY saknas");
  const resend = new Resend(RESEND_KEY);

  // Fallback: interna adresser kan vara kinkiga → använd Resends avsändare
  const isInternal = /@helsingbuss\.se$/i.test(args.to);
  const from = isInternal ? FROM_FALLBACK : FROM_PRIMARY;

  const payload: any = {
    from,
    to: args.to,
    subject: args.subject,
    html: args.html,
    text: args.text,
    ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
    ...(args.bcc?.length ? { bcc: args.bcc } : {}),
  };
  if (BCC_ALL) {
    payload.bcc = Array.isArray(payload.bcc) ? [...payload.bcc, BCC_ALL] : [BCC_ALL];
  }

  const r: any = await resend.emails.send(payload);
  console.log("[sendOfferMail] Resend send payload.from=", from, "to=", args.to, "result=", r);

  if (r?.error) {
    // Försök en sista gång med Resend fallback-avsändare om den inte redan användes
    if (from !== FROM_FALLBACK) {
      const fallbackPayload = { ...payload, from: FROM_FALLBACK };
      const r2: any = await resend.emails.send(fallbackPayload);
      console.log("[sendOfferMail] Resend fallback FROM used. result=", r2);
      if (r2?.error) throw new Error(r2.error?.message || "Resend fallback error");
      return r2;
    }
    throw new Error(r.error?.message || "Resend error");
  }
  return r;
}

/** Skicka admin-notis + kundmejl, med CTA och HTML-layout */
export async function sendOfferMail(p: SendOfferParams) {
  const adminSubject    = `Ny offertförfrågan ${p.offerNumber}`;
  const customerSubject = `Tack! Vi har mottagit din offertförfrågan (${p.offerNumber})`;

  const htmlAdmin    = renderAdminHtml(p);
  const htmlCustomer = renderCustomerHtml(p);
  const text         = renderText(p);

  // 1) ADMIN
  const toAdmin = FORCE_TO || ADMIN || OFFERS_INBOX;
  if (toAdmin) {
    await sendViaResend({
      to: toAdmin,
      subject: adminSubject,
      html: htmlAdmin,
      text,
    });
  } else {
    console.warn("[sendOfferMail] ADMIN/INBOX saknas – hoppar över admin-notis");
  }

  // 2) KUND
  const emailRegex = /\S+@\S+\.\S+/;
  const toCustomer = FORCE_TO || p.customerEmail;
  if (toCustomer && emailRegex.test(toCustomer)) {
    await sendViaResend({
      to: toCustomer,
      subject: customerSubject,
      html: htmlCustomer,
      text,
      bcc: FORCE_TO ? undefined : (OFFERS_INBOX ? [OFFERS_INBOX] : undefined),
    });
  } else {
    console.warn("[sendOfferMail] Ogiltig kundadress – hoppar över kundmejl:", toCustomer);
  }

  return { ok: true as const, forced: !!FORCE_TO };
}
