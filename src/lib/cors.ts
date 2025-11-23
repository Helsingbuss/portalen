// src/lib/cors.ts
import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Läser ALLOWED_ORIGINS från env
 * - Ex: "https://helsingbuss.se,https://www.helsingbuss.se,https://login.helsingbuss.se"
 * - Om ALLOWED_ORIGINS är tomt eller "*" => tillåt alla origins (inte rekommenderat i produktion)
 */
function parseAllowed(): string[] {
  const raw = (process.env.ALLOWED_ORIGINS || "").trim();

  if (!raw || raw === "*") {
    // "allow all" läge – använd med försiktighet
    return ["*"];
  }

  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Försöker plocka ut origin (scheme + host) från request:
 * - Origin-header (vanligt från webbläsare)
 * - Referer (om Origin saknas)
 */
function originFromReq(req: NextApiRequest): string {
  const candidate =
    (req.headers.origin as string | undefined) ||
    (req.headers.referer as string | undefined) ||
    "";

  if (!candidate) return "";

  try {
    const u = new URL(candidate);
    return `${u.protocol}//${u.host}`; // t.ex. "https://helsingbuss.se"
  } catch {
    return "";
  }
}

/**
 * Sätter CORS-headrar och returnerar true/false om requesten får fortsätta.
 * - OPTIONS hanteras här (preflight).
 * - Vid blockering returneras 403.
 */
export function allowCors(
  req: NextApiRequest,
  res: NextApiResponse
): boolean {
  const allowed = parseAllowed();
  const origin = originFromReq(req);

  const allowAll = allowed.includes("*");
  const isAllowed = allowAll || !origin || allowed.includes(origin);

  // Sätt alltid bas-headrar
  if (origin && isAllowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (allowAll) {
    res.setHeader("Access-Control-Allow-Origin", "*");
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

/**
 * Wrapper: använd så här i API-routes:
 *
 *   export default withCors(handler)
 */
export function withCors<
  T extends (req: NextApiRequest, res: NextApiResponse) => any
>(handler: T) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    if (!allowCors(req, res)) return;
    return handler(req, res);
  };
}
