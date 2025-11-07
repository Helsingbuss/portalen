// src/lib/sendMail.ts
import { Resend } from "resend";
import { signOfferToken } from "@/lib/offerJwt";

/* ============================
   Bas-URL helpers (exporteras)
============================ */
export function baseUrl() {
  // Admin/portal-bas
  const raw = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/$/, "");
  return raw || "http://localhost:3000";
}
export function customerBaseUrl() {
  const fromEnv =
    process.env.CUSTOMER_BASE_URL ||
    process.env.NEXT_PUBLIC_CUSTOMER_BASE_URL;
  if (fromEnv) return fromEnv;

  if (process.env.VERCEL_ENV === "production") {
    return "https://kund.helsingbuss.se";
  }
  return "http://localhost:3000";
}// Lokal fallback
  return "http://localhost:3000";
}const FROM = process.env.MAIL_FROM || "Helsingbuss <info@helsingbuss.se>";
const ADMIN_TO = process.env.MAIL_ADMIN || "offert@helsingbuss.se";
const LOGO_ABS = `${baseUrl()}/mork_logo.png`;

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/* ============================
   HjÃ¤lpare: layout + sÃ¤ndning
============================ */
type CTA = { label: string; href: string } | null;

function escape(s?: string | null) {
  return (s ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderLayout(opts: {
  title: string;
  intro?: string;
  rows?: Array<{ label: string; value: string }>;
  freeHtml?: string;
  cta?: CTA;
}) {
  const rowsHtml =
    (opts.rows || [])
      .map(
        (r) => `
      <tr>
        <td style="padding:4px 0;color:#0f172a80;font-size:12px;width:42%">${escape(r.label)}</td>
        <td style="padding:4px 0;color:#0f172a;font-size:14px">${escape(r.value)}</td>
      </tr>`
      )
      .join("") || "";

  const ctaHtml = opts.cta
    ? `<a href="${opts.cta.href}" style="display:inline-block;background:#194C66;color:#fff;
          text-decoration:none;padding:10px 16px;border-radius:999px;font-size:14px">${escape(
            opts.cta.label
          )}</a>`
    : "";

  const footerHtml = `
    FrÃ¥gor om din resa? Ring vÃ¥rt Kundteam vardagar 8â€“17:
    <strong>010-405 38 38</strong> eller svara pÃ¥ detta mail.
    Vid akuta trafikÃ¤renden utanfÃ¶r kontorstid: <strong>010-777 21 58</strong>.
  `;

  return `<!doctype html>
  <html lang="sv">
    <body style="margin:0;padding:24px;background:#f5f4f0">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr><td align="center">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px">
            <tr>
              <td style="padding:8px 0 16px">
                <img src="${LOGO_ABS}" alt="Helsingbuss" style="max-width:240px;height:auto" />
              </td>
            </tr>

            <tr>
              <td style="background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,.06)">
                <h1 style="margin:0 0 12px 0;font-size:20px;color:#0f172a">${escape(opts.title)}</h1>
                ${opts.intro ? `<p style="margin:0 0 12px 0;color:#0f172a80">${escape(opts.intro)}</p>` : ""}

                ${
                  opts.freeHtml
                    ? `<div style="color:#0f172acc;font-size:14px;line-height:1.6">${opts.freeHtml}</div>`
                    : ""
                }

                ${
                  rowsHtml
                    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                         style="margin-top:12px">${rowsHtml}</table>`
                    : ""
                }

                ${opts.cta ? `<div style="margin-top:16px">${ctaHtml}</div>` : ""}
              </td>
            </tr>

            <tr>
              <td style="padding:14px 6px;color:#0f172a99;font-size:12px">${footerHtml}</td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
  </html>`;
}

async function sendViaResend({
  to,
  subject,
  html,
  bcc,
}: {
  to: string | string[];
  subject: string;
  html: string;
  bcc?: string | string[];
}) {
  if (!resend) {
    console.warn("âš ï¸ Ingen RESEND_API_KEY â€“ kÃ¶r testlÃ¤ge.");
    return { success: true, test: true, to, subject };
  }
  await resend.emails.send({
    from: FROM,
    to,
    subject,
    html,
    bcc,
  });
  return { success: true };
}

/* ============================
   OFFERT â€“ kund + admin
============================ */
export async function sendOfferMail(
  to: string,
  offerId: string,
  status: "inkommen" | "besvarad" | "godkand" | "makulerad",
  offerNumber?: string | null
) {
  // âœ… signOfferToken tar ett objekt: { offer_id, expMinutes? }
  const token = await signOfferToken({ offer_id: offerId }); // default-TTL i offerJwt.ts

  const CUSTOMER_BASE = customerBaseUrl();
  const ADMIN_BASE = baseUrl();
  const publicLink = `${CUSTOMER_BASE}/offert/${encodeURIComponent(offerId)}?t=${encodeURIComponent(token)}`;
  const adminLink = `${ADMIN_BASE}/admin/offers/${offerId}`;
  const displayRef = offerNumber || offerId;

  let subject = "";
  let html = "";

  switch (status) {
    case "inkommen":
      subject = `Tack â€“ vi har mottagit er offertfÃ¶rfrÃ¥gan (${displayRef})`;
      html = renderLayout({
        title: "OffertfÃ¶rfrÃ¥gan mottagen",
        intro: "Vi har tagit emot er fÃ¶rfrÃ¥gan och Ã¥terkommer med prisfÃ¶rslag och detaljer sÃ¥ snart vi kan.",
        freeHtml: `<p>Ni kan fÃ¶lja Ã¤rendet via lÃ¤nken nedan. LÃ¤nken visar alltid den senaste informationen.</p>`,
        rows: [{ label: "Offert-ID", value: displayRef }],
        cta: { label: `Visa er fÃ¶rfrÃ¥gan (${displayRef})`, href: publicLink },
      });
      break;

    case "besvarad":
      subject = `Er offert Ã¤r klar (${displayRef})`;
      html = renderLayout({
        title: "Er offert",
        intro: "Nu Ã¤r ert prisfÃ¶rslag klart. Klicka nedan fÃ¶r att granska och svara.",
        rows: [{ label: "Offert-ID", value: displayRef }],
        cta: { label: `Ã–ppna offerten (${displayRef})`, href: publicLink },
      });
      break;

    case "godkand":
      subject = `Tack â€“ er offert Ã¤r godkÃ¤nd (${displayRef})`;
      html = renderLayout({
        title: "Offerten Ã¤r godkÃ¤nd",
        intro: "Tack! Vi skapar nu er bokning och Ã¥terkommer med bokningsbekrÃ¤ftelse inom kort.",
        rows: [{ label: "Offert-ID", value: displayRef }],
        cta: { label: "Visa offerten", href: publicLink },
      });
      break;

    case "makulerad":
      subject = `Offert makulerad (${displayRef})`;
      html = renderLayout({
        title: "Offerten har makulerats",
        intro: "Er offert Ã¤r inte lÃ¤ngre aktiv. BehÃ¶ver ni ett nytt fÃ¶rslag hjÃ¤lper vi gÃ¤rna till.",
        rows: [{ label: "Offert-ID", value: displayRef }],
        cta: { label: "Kontakta oss", href: `${CUSTOMER_BASE}/kontakt` },
      });
      break;
  }

  // 1) Kund
  const r1 = await sendViaResend({ to, subject, html });

  // 2) Admin-notis (endast vid inkommen)
  if (status === "inkommen") {
    const adminHtml = renderLayout({
      title: "Ny offertfÃ¶rfrÃ¥gan",
      intro: "En ny offert har inkommit via hemsidan.",
      rows: [
        { label: "Offert-ID", value: displayRef },
        { label: "Kundens e-post", value: to },
        { label: "AdminlÃ¤nk", value: adminLink },
      ],
      freeHtml: `<p><a href="${adminLink}">Ã–ppna i Admin</a></p>`,
      cta: null,
    });
    await sendViaResend({
      to: ADMIN_TO,
      subject: `ðŸ“© Ny offertfÃ¶rfrÃ¥gan (${displayRef}) â€“ ${to}`,
      html: adminHtml,
    });
  }

  return r1;
}

/* ============================
   BOKNING â€“ mail
============================ */
export async function sendBookingMail(
  to: string,
  bookingNumber: string, // BK25xxxx
  mode: "created" | "updated",
  details?: {
    passengers?: number | null;
    from?: string | null;
    to?: string | null;
    date?: string | null;
    time?: string | null;
    freeTextHtml?: string; // valfri egen text
  }
) {
  const displayRef = bookingNumber;
  const link = `${customerBaseUrl()}/booking/${encodeURIComponent(bookingNumber)}`;

  const rows: Array<{ label: string; value: string }> = [
    { label: "Ordernummer (Boknings ID)", value: displayRef },
  ];
  if (details?.passengers) rows.push({ label: "Passagerare", value: String(details.passengers) });
  if (details?.from) rows.push({ label: "FrÃ¥n", value: details.from });
  if (details?.to) rows.push({ label: "Till", value: details.to });
  if (details?.date) rows.push({ label: "Datum", value: details.date });
  if (details?.time) rows.push({ label: "Tid", value: details.time });

  const baseText =
    details?.freeTextHtml ??
    `<p>VÃ¤nligen klicka pÃ¥ knappen fÃ¶r att se vad som har registrerats.
      Fakturan skickas efter utfÃ¶rt uppdrag. Kontrollera gÃ¤rna att allt stÃ¤mmer.</p>`;

  const subject =
    mode === "created"
      ? `BokningsbekrÃ¤ftelse (${displayRef})`
      : `Uppdatering â€“ Bokning ${displayRef}`;

  const html = renderLayout({
    title: mode === "created" ? "BokningsbekrÃ¤ftelse" : "Uppdatering av bokning",
    intro: mode === "created" ? "Tack fÃ¶r er bokning!" : "Vi har uppdaterat er bokning.",
    rows,
    freeHtml: baseText,
    cta: { label: `Visa bokningen (${displayRef})`, href: link },
  });

  return sendViaResend({ to, subject, html });
}

/* ============================
   KÃ–RORDER â€“ mail
============================ */
export async function sendDriverOrderMail(
  to: string, // chauffÃ¶rens e-post
  payload: {
    driverName?: string | null;
    out: { date?: string | null; time?: string | null; from?: string | null; to?: string | null };
    ret?: { date?: string | null; time?: string | null; from?: string | null; to?: string | null };
    contact?: { name?: string | null; phone?: string | null };
    vehicle?: { reg?: string | null };
    freeTextHtml?: string;
  }
) {
  const rows: Array<{ label: string; value: string }> = [];

  if (payload.out.date) rows.push({ label: "Utresa datum", value: payload.out.date });
  if (payload.out.time) rows.push({ label: "Utresa tid", value: payload.out.time });
  if (payload.out.from) rows.push({ label: "Utresa frÃ¥n", value: payload.out.from });
  if (payload.out.to) rows.push({ label: "Utresa till", value: payload.out.to });

  if (payload.ret?.date) rows.push({ label: "Retur datum", value: payload.ret.date });
  if (payload.ret?.time) rows.push({ label: "Retur tid", value: payload.ret.time });
  if (payload.ret?.from) rows.push({ label: "Retur frÃ¥n", value: payload.ret.from });
  if (payload.ret?.to) rows.push({ label: "Retur till", value: payload.ret.to });

  if (payload.contact?.name) rows.push({ label: "Kontakt pÃ¥ plats", value: payload.contact.name });
  if (payload.contact?.phone) rows.push({ label: "Telefon", value: payload.contact.phone });
  if (payload.vehicle?.reg) rows.push({ label: "Fordon", value: payload.vehicle.reg });

  const subject = `KÃ¶rorder${payload.driverName ? ` â€“ ${payload.driverName}` : ""}`;
  const html = renderLayout({
    title: subject,
    intro: "HÃ¤r Ã¤r uppdraget. VÃ¤nligen bekrÃ¤fta om nÃ¥got inte stÃ¤mmer.",
    rows,
    freeHtml: payload.freeTextHtml,
    cta: null,
  });

  return sendViaResend({ to, subject, html });
}


export { sendViaResend as sendMail };




