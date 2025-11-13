// src/pages/api/_debug/email-ping.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { Resend } from "resend";

const strip = (s?: string | null) => (s ?? "").toString().trim().replace(/^["']|["']$/g, "");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = strip(process.env.RESEND_API_KEY);
  const from = strip(process.env.MAIL_FROM) || "Helsingbuss <no-reply@helsingbuss.se>";
  const to = strip(process.env.TEST_MAIL_TO) || strip(process.env.ADMIN_ALERT_EMAIL) || "info@helsingbuss.se";

  try {
    if (!apiKey) return res.status(400).json({ error: "RESEND_API_KEY saknas" });

    const resend = new Resend(apiKey);
    const r = await resend.emails.send({
      from,
      to,
      subject: "🔧 email-ping",
      html: `<pre>from=${from}</pre>`,
    });

    if ((r as any)?.error) return res.status(400).json({ error: (r as any).error.message || "Resend error" });
    return res.status(200).json({ ok: true, to, from });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "error" });
  }
}
