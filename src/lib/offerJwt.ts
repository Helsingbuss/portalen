import crypto from "crypto";

/**
 * Minimal HMAC-baserad token (ingen extern lib).
 * Format: base64url(header).base64url(payload).base64url(signature)
 * - payload: { offer_id, iat, exp }
 * - signeras med OFFER_JWT_SECRET
 */

const SECRET =
  (process.env.OFFER_JWT_SECRET || process.env.JWT_SECRET || "").trim() ||
  "dev-only-secret-change-me";

function b64url(buf: Buffer | string) {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf, "utf8");
  return b
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function hmac(input: string) {
  return b64url(crypto.createHmac("sha256", SECRET).update(input).digest());
}

type SignParams =
  | { offer_id: string; expiresInDays?: number }
  | { offer_id: string; expMinutes?: number };

/** Skapa token för offert-länk. Standard: 30 dagar. */
export function signOfferToken(params: SignParams): string {
  const { offer_id } = params as { offer_id: string };
  if (!offer_id) throw new Error("offer_id required");

  const nowSec = Math.floor(Date.now() / 1000);

  // TTL (sekunder)
  let ttlSeconds = 60 * 60 * 24 * 30; // 30 dagar default
  if ("expiresInDays" in params && typeof params.expiresInDays === "number") {
    ttlSeconds = Math.max(60, Math.floor(params.expiresInDays * 86400));
  }
  if ("expMinutes" in params && typeof (params as any).expMinutes === "number") {
    ttlSeconds = Math.max(60, Math.floor((params as any).expMinutes * 60));
  }

  const header = { alg: "HS256", typ: "JWT", aud: "offer-view" };
  const payload = { offer_id, iat: nowSec, exp: nowSec + ttlSeconds };

  const headerPart = b64url(JSON.stringify(header));
  const payloadPart = b64url(JSON.stringify(payload));
  const unsigned = `${headerPart}.${payloadPart}`;
  const signaturePart = hmac(unsigned);

  return `${unsigned}.${signaturePart}`;
}

export type OfferTokenPayload = {
  offer_id: string;
  iat: number;
  exp: number;
};

/** Verifiera token och returnera payload. Kastar vid fel. */
export function verifyOfferToken(token: string): OfferTokenPayload {
  if (!token || typeof token !== "string") throw new Error("missing token");
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("malformed token");

  const [headerPart, payloadPart, sigPart] = parts;
  const unsigned = `${headerPart}.${payloadPart}`;
  const expected = hmac(unsigned);
  if (!crypto.timingSafeEqual(Buffer.from(sigPart), Buffer.from(expected))) {
    throw new Error("invalid signature");
  }

  let payload: OfferTokenPayload;
  try {
    payload = JSON.parse(
      Buffer.from(payloadPart.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")
    );
  } catch {
    throw new Error("invalid payload");
  }

  if (!payload.offer_id || typeof payload.exp !== "number") {
    throw new Error("invalid payload");
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.exp <= nowSec) throw new Error("expired");

  return payload;
}