// src/lib/offerToken.ts
import jwt, { type Secret } from "jsonwebtoken";

const SECRET: Secret = (process.env.JWT_SECRET as Secret) || "dev-secret-change-me";

export type OfferTokenPayload = {
  // Kanoniska fält
  offerId?: string;
  offerNumber?: string | number | null;

  // Alias för bakåtkompatibilitet (din sida använder dessa)
  id?: string;
  no?: string | number | null;

  iat?: number;
  exp?: number;
};

/**
 * Signera ett JWT för en offert.
 * - Lägger in både kanoniska fält och alias (id/no) för bakåtkompatibilitet.
 * - expiresIn i SEKUNDER (default 7 dygn).
 */
export function signOfferToken(
  payload: Omit<OfferTokenPayload, "iat" | "exp">,
  opts?: { expiresInSec?: number }
): string {
  const expiresIn = typeof opts?.expiresInSec === "number" ? opts.expiresInSec : 60 * 60 * 24 * 7; // 7d

  const canonical: Record<string, unknown> = {
    ...(payload.offerId ? { offerId: payload.offerId } : {}),
    ...(payload.offerNumber != null ? { offerNumber: payload.offerNumber } : {}),
  };

  // Alias för sidor som läser id/no
  if (payload.offerId && !("id" in payload)) canonical.id = payload.offerId;
  if (payload.offerNumber != null && !("no" in payload)) canonical.no = payload.offerNumber;

  // Om inkommande payload redan råkar ha alias, ta med dem också
  if (payload.id && !canonical.offerId) canonical.offerId = payload.id;
  if (payload.no != null && !canonical.offerNumber) canonical.offerNumber = payload.no;

  return jwt.sign(canonical, SECRET, { expiresIn });
}

/**
 * Verifiera token och se till att både kanoniska fält och alias finns i svaret.
 */
export function verifyOfferToken(token: string): OfferTokenPayload {
  const p = jwt.verify(token, SECRET) as Record<string, unknown>;

  const out: OfferTokenPayload = {
    offerId: (p.offerId as string) || (p.id as string) || undefined,
    offerNumber:
      (p.offerNumber as string | number | null) ??
      (p.no as string | number | null) ??
      null,
    id: (p.id as string) || (p.offerId as string) || undefined,
    no:
      (p.no as string | number | null) ??
      (p.offerNumber as string | number | null) ??
      null,
    iat: p.iat as number | undefined,
    exp: p.exp as number | undefined,
  };

  return out;
}
