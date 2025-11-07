import { sendMail, customerBaseUrl } from "./sendMail";

/**
 * Booking mail payload used by API routes.
 * - Top-level fields kept for backward compatibility (from/toPlace/date/time)
 * - Primary fields are nested in `out` and `ret` and include `to`
 */
export type SendBookingParams = {
  to: string;                 // customer's email
  bookingNumber: string;      // e.g. BK25xxxx
  mode?: "created" | "updated";

  // Back-compat flat fields (optional)
  passengers?: number | null;
  from?: string | null;       // fallback if out.from missing
  toPlace?: string | null;    // fallback if out.to missing
  date?: string | null;       // fallback if out.date missing
  time?: string | null;       // fallback if out.time missing

  // Primary structured legs
  out?: { date?: string | null; time?: string | null; from?: string | null; to?: string | null };
  ret?: { date?: string | null; time?: string | null; from?: string | null; to?: string | null };

  freeTextHtml?: string;
};

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

  // Outbound
  if (out.date) r.push({ label: "Utresa datum", value: out.date });
  if (out.time) r.push({ label: "Utresa tid", value: out.time });
  if (out.from) r.push({ label: "Utresa från", value: out.from });
  if (out.to)   r.push({ label: "Utresa till", value: out.to });

  // Return (optional)
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

/** Public function used by API route */
export async function sendBookingMail(p: SendBookingParams) {
  const base = customerBaseUrl(); // e.g. https://kund.helsingbuss.se
  const link = `${base}/booking/${encodeURIComponent(p.bookingNumber)}`;

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



