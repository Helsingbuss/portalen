// src/pages/api/bookings/send-confirmation.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { sendBookingMail } from "@/lib/sendBookingMail";

type JsonError = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any | JsonError>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { bookingNumber, email, to, details } = req.body || {};
    const recipient = (to || email || "").toString().trim();

    if (!bookingNumber || !recipient) {
      return res
        .status(400)
        .json({ error: "Saknar bookingNumber eller mottagare (email/to)." });
    }

    const d = details || {};

    await sendBookingMail({
      to: recipient,
      bookingNumber: String(bookingNumber),
      passengers: d?.passengers ?? null,
      out: d?.out ?? {
        date: d?.departure_date ?? null,
        time: d?.departure_time ?? null,
        from: d?.departure_place ?? null,
        to: d?.destination ?? null,
      },
      ret: d?.ret ?? null,
    });

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error("/api/bookings/send-confirmation error:", e?.message || e);
    return res
      .status(500)
      .json({ error: e?.message || "Kunde inte skicka bekräftelsen." });
  }
}
