// src/pages/api/diag/ping.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { allowCors } from "@/lib/cors";




export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!allowCors(req, res)) return;
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET,POST,OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }
  return res.status(200).json({
    ok: true,
    method: req.method,
    origin: req.headers.origin || null,
    time: new Date().toISOString(),
  });
}

