import type { NextApiRequest, NextApiResponse } from "next";
import { Resend } from "resend";





function fromFor(to: string) {
  const primary = process.env.MAIL_FROM || "Helsingbuss <info@helsingbuss.se>";
  const fallback = "Helsingbuss <onboarding@resend.dev>";
  return /@helsingbuss\.se$/i.test(to) ? fallback : primary;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const key  = process.env.RESEND_API_KEY;
  const to   = process.env.TEST_MAIL_TO || process.env.OFFERS_INBOX || process.env.ADMIN_ALERT_EMAIL || "";
  const base =
    process.env.NEXT_PUBLIC_LOGIN_BASE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "http://localhost:3000";

  if (!key) return res.status(500).json({ error: "Missing RESEND_API_KEY" });
  if (!to)  return res.status(400).json({ error: "No TEST_MAIL_TO / OFFERS_INBOX / ADMIN_ALERT_EMAIL" });

  const resend = new Resend(key);
  const from = fromFor(to);

  const r = await resend.emails.send({
    from,
    to,
    subject: "TEST: Helsingbuss Portal (email-ping)",
    html: `<p>Hej! Detta Ã¤r ett test frÃ¥n API:t.<br/><a href="${base}/start">Ã–ppna Admin</a></p>`,
    text: `Hej! Detta Ã¤r ett test frÃ¥n API:t.\n${base}/start`,
  } as any);

  if ((r as any)?.error) {
    return res.status(400).json({ error: (r as any).error?.message || "Resend error" });
  }
  return res.status(200).json({ ok: true, result: r });
}

