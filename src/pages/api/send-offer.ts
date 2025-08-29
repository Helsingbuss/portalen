// pages/api/send-offer.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { sendOfferMail } from "../../lib/sendMail";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { to, offerId, customerName, status } = req.body;

  try {
    await sendOfferMail(to, offerId, customerName, status);
    res.status(200).json({ success: true, message: "Email sent" });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
}
