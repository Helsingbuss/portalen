// src/lib/cors.ts
import type { NextApiRequest, NextApiResponse } from "next";

function parseAllowed(): string[] {
  const raw = process.env.ALLOWED_ORIGINS || "";
  return raw
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
}

function originFromReq(req: NextApiRequest): string {
  // PowerShell/curl etc kan sakna Origin
  const o = (req.headers.origin || req.headers.referer || "") as string;
  try {
    if (!o) return "";
    const u = new URL(o);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "";
  }
}

export function allowCors(req: NextApiRequest, res: NextApiResponse): boolean {
  const allowed = parseAllowed();
  const origin = originFromReq(req);

  const isAllowed = !origin || allowed.includes(origin);

  // sätt alltid basic headers så webben funkar
  if (origin && isAllowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
  res.setHeader("Access-Control-Max-Age", "86400");

  // Preflight
  if (req.method === "OPTIONS") {
    if (!isAllowed) {
      res.status(403).json({ error: "CORS origin not allowed" });
      return false;
    }
    res.status(200).end();
    return false;
  }

  if (!isAllowed) {
    res.status(403).json({ error: "CORS origin not allowed" });
    return false;
  }
  return true;
}

// Wrapper ifall du vill dekorera en handler
export function withCors<T extends (req: NextApiRequest, res: NextApiResponse) => any>(
  handler: T
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    if (!allowCors(req, res)) return;
    return handler(req, res);
  };
}
