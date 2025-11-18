// src/pages/api/debug/resend-status.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { Resend } from "resend";



type Ok = {
  ok: true;
  env: {
    hasKey: boolean;
    keyPrefix?: string;
    from?: string;
    offersInbox?: string;
    forceTo?: string | null;
  };
  domains: Array<{ id: string; name: string; status: string; region?: string }>;
};

type Err = { ok: false; error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Ok | Err>
) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const key = process.env.RESEND_API_KEY?.trim();
    const hasKey = !!key;

    const envInfo = {
      hasKey,
      keyPrefix: key ? key.slice(0, 7) : undefined,
      from: process.env.MAIL_FROM || process.env.EMAIL_FROM,
      offersInbox: process.env.OFFERS_INBOX,
      forceTo: process.env.MAIL_FORCE_TO ?? null,
    };

    let domains: Array<{ id: string; name: string; status: string; region?: string }> = [];

    if (hasKey) {
      const resend = new Resend(key!);
      try {
        const list = await resend.domains.list(); // { data: Domain[], ... }
        const data = (list as any)?.data ?? [];
        if (Array.isArray(data)) {
          domains = data.map((d: any) => ({
            id: String(d.id),
            name: String(d.name),
            status: String(d.status),
            region: d.region ? String(d.region) : undefined,
          }));
        }
      } catch {
        // LÃ¥t domains vara tom om listning misslyckas
      }
    }

    return res.status(200).json({ ok: true, env: envInfo, domains });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "Serverfel" });
  }
}
