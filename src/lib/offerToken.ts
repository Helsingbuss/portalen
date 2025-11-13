// src/lib/offerToken.ts
import jwt from "jsonwebtoken";

type JWTPayload = {
  sub?: string;          // offert-id
  no?: string;           // offer_number
  role?: "customer" | "admin";
  [k: string]: any;
};

const SECRET = (process.env.OFFER_JWT_SECRET || "").trim();
const DEBUG_FALLBACK = (process.env.DEBUG_EMAIL_TOKEN || "debug-token").trim();

/**
 * Skapar en länk-token för offert (kundlänk).
 * exp kan vara t.ex. "14d" eller 3600. Vi castar till any för att undvika typ-strul i jsonwebtoken@types.
 */
export function createOfferToken(
  payload: { sub: string; no: string; role?: "customer" | "admin" },
  exp: string | number = "14d"
): string {
  if (!SECRET) return DEBUG_FALLBACK;

  const opts: jwt.SignOptions = {
    algorithm: "HS256",
    // jsonwebtoken-typerna använder en branded typ för strings -> casta för att accepteras
    expiresIn: exp as any,
  };

  return jwt.sign(payload as any, SECRET as jwt.Secret, opts);
}

/**
 * Verifierar token och returnerar payload (inkl. .sub och .no).
 */
export async function verifyOfferToken(token: string): Promise<JWTPayload> {
  if (!SECRET) throw new Error("missing-secret");
  return jwt.verify(token, SECRET as jwt.Secret) as JWTPayload;
}
