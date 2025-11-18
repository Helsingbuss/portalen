import type { NextApiRequest, NextApiResponse } from "next";
import { signOfferToken } from "@/lib/offerJwt";




/** HÃ¤mta bas-URL fÃ¶r kunddomÃ¤nen (kund.helsingbuss.se om satt) */
function customerBase(req: NextApiRequest): string {
  const envBase =
    process.env.NEXT_PUBLIC_CUSTOMER_BASE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL;
  if (envBase) return envBase.replace(/\/$/, "");
  // fallback: bygg frÃ¥n inkommande host (dev)
  const host = req.headers.host || "localhost:3000";
  const proto = host.includes("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { offer_id, ttl } = req.query;

  if (!offer_id) {
    return res.status(400).json({ ok: false, error: "Missing offer_id" });
  }

  // tolka TTL: om string med siffra â†’ minuter, annars default 30 dagar
  let expMinutes = 60 * 24 * 30; // 30 dagar
  if (typeof ttl === "string" && /^\d+$/.test(ttl)) {
    expMinutes = parseInt(ttl, 10);
  }

  const token = await signOfferToken({
    offer_id: String(offer_id),
    expMinutes,
  });

  const BASE = customerBase(req);
  const url = `${BASE}/offert/${encodeURIComponent(String(offer_id))}?t=${encodeURIComponent(token)}`;

  return res.status(200).json({ ok: true, url, token });
}




