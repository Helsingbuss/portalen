import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "@/lib/supabaseAdmin";
import { Resend } from "resend";




const supabase = (admin as any).supabaseAdmin || (admin as any).supabase || (admin as any).default;

const BASE = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/$/, "") || "http://localhost:3000";
const ADMIN_TO = process.env.MAIL_ADMIN || "offert@helsingbuss.se";
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { offerNumber, message } = req.body as { offerNumber?: string; message?: string };
    if (!offerNumber) return res.status(400).json({ error: "offerNumber is required" });

    const { data: offer, error } = await supabase
      .from("offers")
      .select("*")
      .eq("offer_number", offerNumber)
      .single();
    if (error || !offer) return res.status(404).json({ error: "Offer not found" });

    await supabase.from("offers").update({
      change_request_at: new Date().toISOString(),
      change_note: message || null,
    }).eq("id", offer.id);

    if (resend) {
      await resend.emails.send({
        from: process.env.MAIL_FROM || "Helsingbuss <info@helsingbuss.se>",
        to: ADMIN_TO,
        subject: `âœï¸ Ã„ndringsfÃ¶rfrÃ¥gan pÃ¥ offert ${offer.offer_number || offer.id}`,
        html: `
          <p>Kunden har begÃ¤rt Ã¤ndringar pÃ¥ en offert.</p>
          <p><strong>Offert:</strong> ${offer.offer_number || offer.id}</p>
          ${message ? `<p><strong>Meddelande:</strong> ${message}</p>` : ""}
          <p><a href="${BASE}/admin/offers/${offer.id}">Ã–ppna i Admin</a></p>
        `,
      });
    }

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}

