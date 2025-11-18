// src/pages/api/offert/ticket.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { signTicket } from "@/lib/formTicket";
import crypto from "crypto";




export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const ua = req.headers["user-agent"] || "";
  const origin = (req.headers.origin as string) || null;

  const payload = {
    iss: "offert" as const,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 10 * 60, // 10 minuter
    ua: crypto.createHash("sha256").update(String(ua)).digest("hex"),
    o: origin,
  };

  return res.status(200).json({ ticket: signTicket(payload) });
}

