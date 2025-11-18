// src/pages/api/debug/ping.ts
import type { NextApiRequest, NextApiResponse } from "next";



export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({ ok: true, ping: "pong", ts: new Date().toISOString() });
}
