// src/lib/sendBookingMail.ts
import { Resend } from "resend";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
const FROM = "Helsingbuss <info@helsingbuss.se>";
const apiKey = process.env.RESEND_API_KEY || "";
const resend = apiKey ? new Resend(apiKey) : null;

function wrap(s: string) {
  return `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;line-height:1.5;color:#111">${s}</div>`;
}

export async function sendBookingMail(
  email: string,
  bookingNumber: string,
  details: { offerId?: string } = {}
) {
  const url = details.offerId ? `${BASE}/offert/${details.offerId}` : BASE;

  const html = wrap(`
    <p>Hej!</p>
    <p>Tack – din bokning <strong>${bookingNumber}</strong> är registrerad.</p>
    ${details.offerId ? `<p>Du kan se aktuell information här: <a href="${url}">${url}</a></p>` : ""}
    <p>Vänliga hälsningar<br/>Helsingbuss Kundteam</p>
  `);

  if (!resend) {
    console.warn("⚠️ Resend saknas – skickar INTE bokningsmejl.", { email, bookingNumber });
    return { ok: true, test: true };
  }

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Din bokning är registrerad (${bookingNumber})`,
    html,
  });

  return { ok: true };
}
