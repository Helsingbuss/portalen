// src/pages/api/offers/sign.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { signOfferToken } from "@/lib/offerJwt";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });
  const { offer_id, recipient, ttl } = req.body || {};
  if (!offer_id) return res.status(400).json({ ok: false, error: "Missing offer_id" });

  const token = signOfferToken(String(offer_id), recipient ? String(recipient) : undefined, ttl || "30d");
  const url = `${BASE}/offers/${offer_id}?t=${encodeURIComponent(token)}`;
  return res.status(200).json({ ok: true, url, token });
}
