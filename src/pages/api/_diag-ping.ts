// src/pages/api/diag/ping.ts
import type { NextApiRequest, NextApiResponse } from "next";





export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Ã–PPEN CORS (endast fÃ¶r diagnos)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  res.status(200).json({
    ok: true,
    method: req.method,
    time: new Date().toISOString(),
    origin: req.headers.origin || null,
    host: req.headers.host || null,
  });
}

