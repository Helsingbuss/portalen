// src/pages/api/debug/resend-get.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { Resend } from "resend";




type Ok = { ok: true; id: string; data?: any };
type Err = { ok: false; error: string };

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";

export default async function handler(req: NextApiRequest, res: NextApiResponse<Ok | Err>) {
  try {
    if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method not allowed" });
    if (!RESEND_API_KEY) return res.status(500).json({ ok: false, error: "RESEND_API_KEY saknas i miljÃ¶n" });

    const id = String(req.query.id || "");
    if (!id) return res.status(400).json({ ok: false, error: "Ange ?id=<emailId>" });

    const resend = new Resend(RESEND_API_KEY);
    const r: any = await resend.emails.get(id);

    if (r?.error) return res.status(400).json({ ok: false, error: r.error.message || "Resend error" });

    return res.status(200).json({ ok: true, id, data: r?.data || r });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "Serverfel" });
  }
}

