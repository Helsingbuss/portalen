import type { NextApiRequest, NextApiResponse } from "next";
import { Resend } from "resend";
import { withCors } from "@/lib/cors";

async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  const to = (req.query.to as string) || (req.body?.to as string) || process.env.TEST_MAIL_TO || process.env.ADMIN_ALERT_EMAIL;
  const key = process.env.RESEND_API_KEY;
  if (!key) { res.status(500).json({ error: "Missing RESEND_API_KEY" }); return; }

  const resend = new Resend(key);
  const from = process.env.RESEND_FROM_FALLBACK || "Helsingbuss <onboarding@resend.dev>";
  try {
    const r: any = await resend.emails.send({
      from,
      to,
      subject: "Ping från Helsingbuss Portal",
      html: `<p>Diagnostikmail till ${to}. From=${from}</p>`,
      text: `Diagnostikmail till ${to}. From=${from}`,
    } as any);
    res.status(200).json({ ok: true, result: r });
    return;
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
    return;
  }
}

export default withCors(handler);
