import { sendMail, customerBaseUrl } from "./sendMail";

export type SendBookingParams = {
  to: string;                  // kundens e-post
  bookingId: string;           // boknings-ID
  title: string;               // t.ex. "Bokningsbekräftelse"
  summaryHtml?: string;        // valfri sammanfattning (HTML)
  summaryText?: string;        // valfri sammanfattning (text)
};

function bookingLink(bookingId: string) {
  // Offentliga bokningar har oftast ingen JWT – lägg till om du vill
  return `${customerBaseUrl()}/bokning/${encodeURIComponent(bookingId)}`;
}

function renderHtml(p: SendBookingParams) {
  const link = bookingLink(p.bookingId);
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111">
    <h2 style="margin:0 0 8px 0">${p.title}</h2>
    ${p.summaryHtml || ""}
    <div style="margin:18px 0">
      <a href="${link}" target="_blank" rel="noopener"
         style="display:inline-block;padding:10px 16px;border-radius:999px;
                background:#194C66;color:#fff;text-decoration:none;font-weight:600">
        Visa din bokning
      </a>
    </div>
    <hr style="border:none;border-top:1px solid #eee;margin:16px 0" />
    <div style="color:#6b7280;font-size:12px">Helsingbuss</div>
  </div>`;
}

function renderText(p: SendBookingParams) {
  const link = bookingLink(p.bookingId);
  return [
    p.title,
    "",
    p.summaryText || "",
    "",
    `Visa din bokning: ${link}`,
  ].join("\n");
}

export async function sendBookingMail(p: SendBookingParams) {
  await sendMail({
    to: p.to,
    subject: p.title,
    html: renderHtml(p),
    text: renderText(p),
  });
  return { ok: true as const };
}
