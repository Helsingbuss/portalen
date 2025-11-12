import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export type DriverOrderSummary = {
  order_number?: string | null;
  date?: string | null;
  time?: string | null;
  from?: string | null;
  to?: string | null;
  ret_date?: string | null;
  ret_time?: string | null;
  ret_from?: string | null;
  ret_to?: string | null;
  vehicle_reg?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  passengers?: number | null;
};

export async function sendDriverOrderMail(to: string, orderId: string, sum: DriverOrderSummary) {
  if (!RESEND_API_KEY || !to) {
    console.warn("[sendDriverOrderMail] saknar API-nyckel eller mottagare");
    return;
  }
  const resend = new Resend(RESEND_API_KEY);

  const title = sum.order_number
    ? `Körorder ${sum.order_number} – ${sum.date ?? ""} ${sum.time ?? ""}`.trim()
    : `Körorder – ${sum.date ?? ""} ${sum.time ?? ""}`.trim();

  const link = `${BASE_URL}/driver-order/${orderId}`;
  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,'Helvetica Neue',Arial;">
    <h2 style="margin:0 0 12px;color:#194C66">${title}</h2>
    <table cellspacing="0" cellpadding="6" style="border-collapse:collapse;font-size:14px">
      <tr><td><b>Utresa</b></td><td>${sum.from ?? "—"} → ${sum.to ?? "—"}</td></tr>
      <tr><td><b>Avgång</b></td><td>${sum.date ?? "—"} ${sum.time ?? ""}</td></tr>
      ${
        sum.ret_date || sum.ret_time || sum.ret_from || sum.ret_to
          ? `<tr><td><b>Retur</b></td><td>${sum.ret_from ?? "—"} → ${sum.ret_to ?? "—"} (${sum.ret_date ?? "—"} ${sum.ret_time ?? ""})</td></tr>`
          : ""
      }
      <tr><td><b>Fordon</b></td><td>${sum.vehicle_reg ?? "—"}</td></tr>
      <tr><td><b>Passagerare</b></td><td>${sum.passengers ?? "—"}</td></tr>
      <tr><td><b>Kontakt</b></td><td>${sum.contact_name ?? "—"} (${sum.contact_phone ?? "—"})</td></tr>
    </table>
    <p style="margin:16px 0">
      <a href="${link}" style="background:#194C66;color:#fff;padding:10px 14px;border-radius:6px;text-decoration:none">Öppna körorder</a>
    </p>
    <p style="color:#555;font-size:12px;margin-top:24px">Helsingbuss</p>
  </div>`.trim();

  await resend.emails.send({
    from: "Helsingbuss Trafikledning <info@helsingbuss.se>",
    to,
    subject: title,
    html,
  });
}
