// src/lib/offerJwt.ts
import crypto from "crypto";
import { signOfferToken, getCustomerBaseUrl } from "@/lib/offerJwt";

// ---- Settings / helpers -----------------------------------------------------

function getSecret(): string {
  const s = process.env.OFFER_JWT_SECRET;
  if (!s) throw new Error("Missing env OFFER_JWT_SECRET");
  return s;
}

// Base64URL helpers
function b64url(input: Buffer | string): string {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(String(input));
  return b
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}
function b64urlJson(obj: any): string {
  return b64url(Buffer.from(JSON.stringify(obj)));
}
function fromB64url(s: string): Buffer {
  // pad
  const pad = 4 - (s.length % 4 || 4);
  const base64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad === 4 ? 0 : pad);
  return Buffer.from(base64, "base64");
}

// ---- Public helpers for base URLs (used in mail + pages) --------------------

export function getCustomerBaseUrl(): string {
  return (
    (process.env.NEXT_PUBLIC_CUSTOMER_BASE_URL || "").replace(/\/$/, "") ||
    (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export function getLoginBaseUrl(): string {
  return (
    (process.env.NEXT_PUBLIC_LOGIN_BASE_URL || "").replace(/\/$/, "") ||
    (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

// ---- JWT sign/verify (HS256) ------------------------------------------------

type OfferJwtPayload = {
  offer_id: string;
  iat: number; // seconds
  exp: number; // seconds
};

export function signOfferToken(offer_id: string, expiresInDays = 14): string {
  if (!offer_id) throw new Error("offer_id required");
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + expiresInDays * 24 * 60 * 60;

  const payload: OfferJwtPayload = { offer_id, iat: now, exp };

  const part1 = b64urlJson(header);
  const part2 = b64urlJson(payload);
  const data = `${part1}.${part2}`;

  const sig = crypto.createHmac("sha256", getSecret()).update(data).digest();
  const part3 = b64url(sig);

  return `${data}.${part3}`;
}

export function verifyOfferToken(token: string): OfferJwtPayload {
  if (!token) throw new Error("missing token");
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("invalid token format");

  const [p1, p2, p3] = parts;
  const data = `${p1}.${p2}`;
  const expected = b64url(crypto.createHmac("sha256", getSecret()).update(data).digest());

  if (p3 !== expected) throw new Error("invalid signature");

  const payloadJson = fromB64url(p2).toString("utf8");
  const payload = JSON.parse(payloadJson) as OfferJwtPayload;

  if (!payload.offer_id) throw new Error("invalid payload");
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === "number" && now >= payload.exp) {
    throw new Error("expired");
  }
  return payload;
}
