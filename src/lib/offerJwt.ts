// src/lib/offerJwt.ts
import crypto from "crypto";

/**
 * Säkerhets-hemlighet för offertlänkar (MÅSTE vara satt i miljön!)
 * Skapa med t.ex.:
 *   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
 */
const SECRET = (process.env.OFFER_JWT_SECRET || "").trim();
if (!SECRET) {
  console.warn("⚠ OFFER_JWT_SECRET is not set. Public offer links will not be secure.");
}

/** Bas-URL för kunddomänen (kund.helsingbuss.se → fallbacks till BASE_URL → localhost) */
export function getCustomerBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_CUSTOMER_BASE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

// ---- Base64url helpers ------------------------------------------------------

function b64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64urlJson(obj: unknown) {
  return b64url(Buffer.from(JSON.stringify(obj)));
}

function hmacSha256(data: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(data).digest();
}

// ---- Sign & verify ----------------------------------------------------------

type SignInput =
  | string
  | {
      offer_id: string;
      /** alternativ tidsstyrning i minuter (annars används expiresInDays) */
      expMinutes?: number;
      /** standard 30 dagar om varken expMinutes eller expiresInDays anges */
      expiresInDays?: number;
    };

type TokenPayload = {
  offer_id: string;
  exp: number; // unix epoch (sekunder)
};

/**
 * Skapar ett HMAC-signerat token (JWT-liknande) för offentliga offertlänkar.
 * Accepterar antingen enbart `offer_id` (string) eller ett options-objekt.
 *
 * Standardgiltighet: 30 dagar.
 */
export function signOfferToken(input: SignInput): string {
  const offer_id = typeof input === "string" ? input : input.offer_id;

  let expMinutes: number | undefined;
  if (typeof input !== "string") {
    expMinutes =
      typeof input.expMinutes === "number"
        ? input.expMinutes
        : typeof input.expiresInDays === "number"
        ? input.expiresInDays * 24 * 60
        : undefined;
  }

  // default: 30 dagar
  const minutes = expMinutes ?? 30 * 24 * 60;
  const nowMs = Date.now();
  const expSec = Math.floor((nowMs + minutes * 60_000) / 1000);

  const header = { alg: "HS256", typ: "JWT" };
  const payload: TokenPayload = { offer_id, exp: expSec };

  const head = b64urlJson(header);
  const body = b64urlJson(payload);
  const toSign = `${head}.${body}`;
  const sig = b64url(hmacSha256(toSign, SECRET || "dev-secret"));
  return `${toSign}.${sig}`;
}

/**
 * Verifierar token & giltighetstid. Kastar Error vid ogiltigt/utgånget.
 * Returnerar nyttolasten (offer_id, exp) vid OK.
 */
export function verifyOfferToken(token: string): TokenPayload {
  if (!token || typeof token !== "string" || token.split(".").length !== 3) {
    throw new Error("invalid token format");
  }
  const [headB64, bodyB64, sigB64] = token.split(".");
  const expected = b64url(hmacSha256(`${headB64}.${bodyB64}`, SECRET || "dev-secret"));
  if (sigB64 !== expected) throw new Error("invalid signature");

  const json = Buffer.from(bodyB64.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  const payload = JSON.parse(json) as TokenPayload;

  if (!payload?.offer_id || !payload?.exp) throw new Error("invalid payload");
  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.exp <= nowSec) throw new Error("expired");
  return payload;
}
