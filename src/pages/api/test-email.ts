// src/pages/api/test-email.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { Resend } from "resend";
import { allowCors } from "@/lib/cors";

// Viktigt: REN statisk sträng (eller ta bort helt)
export const config = { runtime: "nodejs" };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowCors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const key  = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || process.env.MAIL_FROM || "onboarding@resend.dev";
  const to   = process.env.TEST_MAIL_TO || process.env.ADMIN_ALERT_EMAIL || "andreas@helsingbuss.se";

  if (!key) return res.status(500).json({ error: "Missing RESEND_API_KEY" });

  const resend = new Resend(key);

  const url =
    process.env.NEXT_PUBLIC_LOGIN_BASE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "http://localhost:3000";

  const r = await resend.emails.send({
    from,
    to,
    subject: "TEST: Helsingbuss Portal",
    html: `<p>Hej! Detta är ett test från API:t.<br/><a href="${url}/offert/HB25007">Visa offert HB25007</a></p>`,
    text: `Hej! Detta är ett test från API:t.\n${url}/offert/HB25007`,
  });

  if ((r as any)?.error) {
    return res.status(400).json({ error: (r as any).error?.message || "Resend error" });
  }

  return res.status(200).json({ ok: true, id: (r as any)?.data?.id || null });
}
