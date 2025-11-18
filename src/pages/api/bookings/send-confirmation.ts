// src/pages/api/bookings/send-confirmation.ts
import type { NextApiRequest, NextApiResponse } from "next";




export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { bookingNumber, email, details } = req.body || {};
  try {
    const mod = await import("@/lib/sendBookingMail").catch(() => null as any);
    if (mod?.sendBookingMail && bookingNumber && email) {
      await mod.sendBookingMail(email, bookingNumber, details || {});
    }
    return res.status(200).json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Kunde inte skicka bekrÃƒÂ¤ftelsen." });
  }
}



