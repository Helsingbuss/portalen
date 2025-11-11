// src/lib/sendBookingMail.ts

/**
 * Skickar bokningsmail via Resend och bygger korrekt länk till publika bokningssidan.
 * - Länken pekar nu på /bokning/[nummer] (svensk ruta) istället för /booking/
 * - "From" hämtas från SUPPORT_INBOX (fallback: support@helsingbuss.se)
 * - OFFERS_INBOX lämnas orörd (används av offertflödena)
 */

export type SendBookingParams = {
  to: string;                 // kundens e-post
  bookingNumber: string;      // t.ex. BK25xxxx
  mode?: "created" | "updated";

  // Back-compat platta fält
  passengers?: number | null;
  from?: string | null;
  toPlace?: string | null;
  date?: string | null;
  time?: string | null;

  // Primära sträckor
  out?: { date?: string | null; time?: string | null; from?: string | null; to?: string | null };
  ret?: { date?: string | null; time?: string | null; from?: string | null; to?: string | null };

  freeTextHtml?: string;
};

/* -------------------- Env helpers -------------------- */

function env(v: string | undefined, fallback = ""): string {
  return (v ?? "").trim() || fallback;
}

function customerBaseUrl(): string {
  // prioritet: CUSTOMER_BASE_URL > NEXT_PUBLIC_CUSTOMER_BASE_URL > NEXT_PUBLIC_BASE_URL
  return (
    env(process.env.CUSTOMER_BASE_URL) ||
    env(process.env.NEXT_PUBLIC_CUSTOMER_BASE_URL) ||
    env(process.env.NEXT_PUBLIC_BASE_URL) ||
    "https://kund.helsingbuss.se"
  );
}

function supportFromAddress(): { fromEmail: string; fromName: string } {
  // skicka från support-inboxen (verifierad i Resend)
  const inbox = env(process.env.SUPPORT_INBOX, "support@helsingbuss.se");
  return { fromEmail: inbox.toLowerCase(), fromName: "Helsingbuss" };
}

/* -------------------- Mail rendering -------------------- */

function rowsFrom(p: SendBookingParams): Array<{ label: string; value: string }> {
  const out = {
    date: p.out?.date ?? p.date ?? null,
    time: p.out?.time ?? p.time ?? null,
    from: p.out?.from ?? p.from ?? null,
    to:   p.out?.to   ?? p.toPlace ?? null,
  };
  const ret = {
    date: p.ret?.date ?? null,
    time: p.ret?.time ?? null,
    from: p.ret?.from ?? null,
    to:   p.ret?.to   ?? null,
  };

  const r: Array<{ label: string; value: string }> = [
    { label: "Ordernummer (Boknings ID)", value: p.bookingNumber },
  ];

  if (p.passengers != null) r.push({ label: "Passagerare", value: String(p.passengers) });

  // Utresa
  if (out.date) r.push({ label: "Utresa datum", value: out.date });
  if (out.time) r.push({ label: "Utresa tid", value: out.time });
  if (out.from) r.push({ label: "Utresa från", value: out.from });
  if (out.to)   r.push({ label: "Utresa till", value: out.to });

  // Retur (valfritt)
  if (ret.date) r.push({ label: "Retur datum", value: ret.date });
  if (ret.time) r.push({ label: "Retur tid", value: ret.time });
  if (ret.from) r.push({ label: "Retur från", value: ret.from });
  if (ret.to)   r.push({ label: "Retur till", value: ret.to });

  return r;
}

function htmlBody(p: SendBookingParams, link: string): string {
  const rows = rowsFrom(p).map(
    (r) => `
      <tr>
        <td style="padding:4px 0;color:#0f172a80;font-size:12px;width:42%">${r.label}</td>
        <td style="padding:4px 0;color:#0f172a;font-size:14px">${r.value}</td>
      </tr>`
  ).join("");

  const intro =
    p.mode === "created"
      ? "Tack för er bokning!"
      : "Vi har uppdaterat er bokning.";

  const freeText = p.freeTextHtml ?? `
    <p>Vänligen klicka på knappen för att se vad som har registrerats.
    Fakturan skickas efter utfört uppdrag. Kontrollera gärna att allt stämmer.</p>
  `;

  return `<!doctype html>
<html lang="sv">
  <body style="margin:0;padding:24px;background:#f5f4f0">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr><td align="center">
        <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px">
          <tr>
            <td style="background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,.06)">
              <h1 style="margin:0 0 12px 0;font-size:20px;color:#0f172a">
                ${p.mode === "created" ? "Bokningsbekräftelse" : "Uppdatering av bokning"}
              </h1>
              <p style="margin:0 0 12px 0;color:#0f172a80">${intro}</p>

              <div style="color:#0f172acc;font-size:14px;line-height:1.6">
                ${freeText}
              </div>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:12px">
                ${rows}
              </table>

              <div style="margin-top:16px">
                <a href="${link}" style="display:inline-block;background:#194C66;color:#fff;text-decoration:none;padding:10px 16px;border-radius:999px;font-size:14px">
                  Visa bokningen (${p.bookingNumber})
                </a>
              </div>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

/* -------------------- Resend transport -------------------- */

async function sendMail(opts: { to: string; subject: string; html: string }) {
  const apiKey = env(process.env.RESEND_API_KEY);
  if (!apiKey) {
    throw new Error("RESEND_API_KEY saknas – kan inte skicka e-post.");
  }

  const { fromEmail, fromName } = supportFromAddress();

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Resend fel ${resp.status}: ${text || resp.statusText}`);
  }
  return resp.json().catch(() => ({}));
}

/* -------------------- Public API -------------------- */

export async function sendBookingMail(p: SendBookingParams) {
  const base = customerBaseUrl(); // ex. https://kund.helsingbuss.se
  // Viktigt: använd svenska routen /bokning/ som finns i appen
  const link = `${base.replace(/\/+$/, "")}/bokning/${encodeURIComponent(p.bookingNumber)}`;

  const subject = p.mode === "created"
    ? `Bokningsbekräftelse (${p.bookingNumber})`
    : `Uppdatering – Bokning ${p.bookingNumber}`;

  const html = htmlBody(p, link);

  return sendMail({
    to: p.to,
    subject,
    html,
  });
}
