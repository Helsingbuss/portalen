// src/lib/offerJwt.ts
import { SignJWT, jwtVerify } from "jose";

function secretKey(): Uint8Array {
  const raw = process.env.OFFER_JWT_SECRET || "dev-offer-secret";
  return new TextEncoder().encode(raw);
}

export type SignParams = {
  offer_id: string;
  /** Giltighet i minuter (default 45 dagar) */
  expMinutes?: number;
};

/** Signera JWT fÃ¶r offert-lÃ¤nk (ASYNC) */
export async function signOfferToken({ offer_id, expMinutes }: SignParams): Promise<string> {
  const ttl = typeof expMinutes === "number" ? expMinutes : 60 * 24 * 45; // 45 dagar
  const token = await new SignJWT({ offer_id, aud: "offer-view" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttl}m`)
    .sign(secretKey());
  return token;
}

/** Verifiera JWT och returnera payload (ASYNC, kastar vid fel) */
export async function verifyOfferToken(token: string): Promise<{ offer_id: string }> {
  const { payload } = await jwtVerify(token, secretKey(), { audience: "offer-view" });
  const offer_id = String(payload?.offer_id || "");
  if (!offer_id) throw new Error("invalid-payload");
  return { offer_id };
}

/** HjÃ¤lpare fÃ¶r bas-URL:er */
export function baseUrl() {
  return (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/$/, "") || "http://localhost:3000";
}
export function customerBaseUrl() {
  return (process.env.NEXT_PUBLIC_CUSTOMER_BASE_URL || baseUrl()).replace(/\/$/, "");
}

