// src/lib/sendOfferMail.ts
import { sendMailWithOfferMirror, customerBaseUrl } from "@/lib/sendMail";

type SendOfferParams = {
  offerId: string;            // uuid i DB (om du vill länka internt)
  offerNumber: string;        // t.ex. HB25010
  customerEmail: string;

  customerName?: string | null;
  customerPhone?: string | null;

  from?: string | null;
  to?: string | null;
  date?: string | null;       // YYYY-MM-DD
  time?: string | null;       // HH:mm
  passengers?: number | null;
  via?: string | null;
  onboardContact?: string | null;

  // retur
  return_from?: string | null;
  return_to?: string | null;
  return_date?: string | null;
  return_time?: string | null;

  notes?: string | null;
};

function row(label: string, value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "";
  return `
    <tr>
      <td style="padding:4px 0;color:#0f172a80;font-size:12px;width:42%">${label}</td>
      <td style="padding:4px 0;color:#0f172a;font-size:14px">${String(value)}</td>
    </tr>`;
}

export async function sendOfferMail(p: SendOfferParams) {
  const base = customerBaseUrl(); // t.ex. https://kund.helsingbuss.se eller NEXT_PUBLIC_BASE_URL
  // Publik visning för kunden (inkommen/offertvy)
  const link = `${base}/offert/${encodeURIComponent(p.offerNumber)}?view=inkommen`;

  const html = `<!doctype html>
<html lang="sv">
  <body style="margin:0;padding:24px;background:#f5f4f0">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr><td align="center">
        <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px">
          <tr>
            <td style="background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,.06)">
              <h1 style="margin:0 0 12px 0;font-size:20px;color:#0f172a">
                Tack för din offertförfrågan – ${p.offerNumber}
              </h1>
              <p style="margin:0 0 12px 0;color:#0f172a80">
                Vi har tagit emot er förfrågan. Klicka på knappen för att granska uppgifterna.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:12px">
                ${row("Offertnummer", p.offerNumber)}
                ${row("Kontakt", p.customerName)}
                ${row("Telefon", p.customerPhone)}
                ${row("Från", p.from)}
                ${row("Till", p.to)}
                ${row("Datum", p.date)}
                ${row("Tid", p.time)}
                ${row("Passagerare", p.passengers ?? null)}
                ${row("Via", p.via)}
                ${row("Kontakt ombord", p.onboardContact)}
                ${row("Retur från", p.return_from)}
                ${row("Retur till", p.return_to)}
                ${row("Retur datum", p.return_date)}
                ${row("Retur tid", p.return_time)}
                ${row("Övrigt", p.notes)}
              </table>

              <div style="margin-top:16px">
                <a href="${link}" style="display:inline-block;background:#194C66;color:#fff;text-decoration:none;padding:10px 16px;border-radius:999px;font-size:14px">
                  Visa offert (${p.offerNumber})
                </a>
              </div>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  await sendMailWithOfferMirror({
    to: p.customerEmail,
    subject: `Tack – offertförfrågan ${p.offerNumber}`,
    html,
  });
}
