import type { NextApiRequest, NextApiResponse } from "next";
import { Resend } from "resend";

export const config = { runtime: "nodejs" };

// smidig env-helper
const env = (v?: string | null) => (v ?? "").toString().trim();
const RESEND_KEY    = env(process.env.RESEND_API_KEY);
const FROM_PRIMARY  = env(process.env.MAIL_FROM) || env(process.env.EMAIL_FROM) || "";
const FROM_FALLBACK = env(process.env.RESEND_FROM_FALLBACK) || "Resend Sandbox <onboarding@resend.dev>";
const TEST_TO       = env(process.env.TEST_MAIL_TO);
const ADMIN_ALERT   = env(process.env.ADMIN_ALERT_EMAIL);
const OFFERS_INBOX  = env(process.env.OFFERS_INBOX);

function isValidFromFormat(v?: string | null) {
  const s = (v ?? "").trim();
  if (!s) return false;
  const named = /^.+<[^<>\s]+@[^<>\s]+\.[^<>\s]+>$/;
  const bare  = /^[^<>\s]+@[^<>\s]+\.[^<>\s]+$/;
  return named.test(s) || bare.test(s);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      return res.status(200).json({ ok: true, method: "GET", via: "pages", time: new Date().toISOString() });
    }
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    if (!RESEND_KEY) {
      return res.status(500).json({ error: "Missing RESEND_API_KEY" });
    }

    const resend = new Resend(RESEND_KEY);

    // välj to → TEST_MAIL_TO > ADMIN_ALERT > OFFERS_INBOX > fallback
    const to =
      TEST_TO ||
      ADMIN_ALERT ||
      OFFERS_INBOX ||
      "info@helsingbuss.se";

    // välj from robust (primär → fallback)
    let from = FROM_PRIMARY;
    if (!isValidFromFormat(from)) {
      from = isValidFromFormat(FROM_FALLBACK) ? FROM_FALLBACK : "Resend Sandbox <onboarding@resend.dev>";
    }

    const base =
      env(process.env.NEXT_PUBLIC_LOGIN_BASE_URL) ||
      env(process.env.NEXT_PUBLIC_BASE_URL) ||
      "https://login.helsingbuss.se";

    const r: any = await resend.emails.send({
      from,
      to,
      subject: "Diagnostik: Helsingbuss Portal – email-ping",
      html: `<p>Hej! Detta är ett diagnostikmail från API:t.</p>
             <p>Tid: ${new Date().toISOString()}</p>
             <p><a href="${base}/start">Öppna portalen</a></p>`,
      text: `Hej! Detta är ett diagnostikmail från API:t.
Tid: ${new Date().toISOString()}
${base}/start`,
    });

    if (r?.error) {
      return res.status(400).json({ error: r.error?.message || "Resend error", from, to });
    }

    return res.status(200).json({ ok: true, result: r?.data || null, from, to, via: "pages", method: "POST" });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
