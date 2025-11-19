// src/pages/api/debug/env-supabase.ts
import type { NextApiRequest, NextApiResponse } from "next";
export const config = { runtime: "nodejs" };
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_KEY,
    runtime: "nodejs",
  });
}
