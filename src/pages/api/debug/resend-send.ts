// src/pages/api/debug/resend-send.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { Resend } from "resend";



type Ok = {
  ok: true;
  id?: string;
  from: string;
  to: string | string[];
  subject: string;
  raw?: any;
};

type Err = { ok: false; error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Ok | Err>
) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const key = process.env.RESEND_API_KEY?.trim();
    if (!key) return res.status(500).json({ ok: false, error: "RESEND_API_KEY saknas" });

    const resend = new Resend(key);

    // body: { to, subject, text, name? }
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});

    const to =
      body.to ??
      process.env.MAIL_FORCE_TO ??
      process.env.OFFERS_INBOX ??
      process.env.ADMIN_ALERT_EMAIL;

    if (!to) return res.status(400).json({ ok: false, error: "Saknar mottagare (to)" });

    const subject = body.subject || "Debugmail frÃ¥n Helsingbuss";
    const text = body.text || "Hej! Detta Ã¤r ett test via /api/debug/resend-send";
    const replyTo = process.env.EMAIL_REPLY_TO || undefined;

    // FrÃ¥n-adress: anvÃ¤nd din brandade fÃ¶rst, annars Resends fallback
    const from =
      process.env.MAIL_FROM ||
      process.env.EMAIL_FROM ||
      process.env.RESEND_FROM_FALLBACK ||
      "onboarding@resend.dev";

    const result = await resend.emails.send({
      from,
      to,
      subject,
      text,
      replyTo,
    } as any);

    const id = (result as any)?.data?.id;
    const errorMsg = (result as any)?.error?.message;

    if (errorMsg) {
      return res.status(200).json({ ok: true, from, to, subject, raw: { error: errorMsg } });
    }

    return res.status(200).json({ ok: true, id, from, to, subject, raw: result });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "Serverfel" });
  }
}
