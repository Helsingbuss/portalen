// src/lib/offerToken.ts
import jwt, { type Secret, type SignOptions, type JwtPayload } from "jsonwebtoken";

const SECRET = process.env.OFFER_JWT_SECRET || "";
const DEBUG_FALLBACK = process.env.DEBUG_EMAIL_TOKEN || "debug-token-123";

type OfferClaims = {
  /** UUID för offerten (server-id) */
  sub?: string;
  /** Offertnummer, t.ex. HB25019 */
  no?: string;
  /** Målgrupp för länken */
  role?: "customer" | "admin";
};

/** Tillåt strängar som "14d", "2h" osv. eller number (sekunder). */
type TTL = `${number}${"ms" | "s" | "m" | "h" | "d"}`;

/** Skapar JWT för offentliga offertlänkar (HS256). */
export function createOfferToken(
  payload: OfferClaims,
  exp: TTL | number = "14d" as TTL
): string {
  // Castar expiresIn till any för att stödja både v8 och v9 av jsonwebtoken
  const opts: SignOptions = { algorithm: "HS256", expiresIn: exp as any };
  if (SECRET) {
    return jwt.sign(payload as any, SECRET as Secret, opts);
  }
  // Dev-fallback om hemlighet saknas
  return DEBUG_FALLBACK;
}

/** Verifierar token och returnerar claims + legacy-fält för bakåtkomp. */
export async function verifyOfferToken(token: string): Promise<Record<string, any>> {
  if (!SECRET && token === DEBUG_FALLBACK) {
    return { sub: "debug", no: "debug", role: "customer", offer_id: "debug", offer_number: "debug" };
  }

  const decoded = jwt.verify(token, SECRET as Secret) as JwtPayload | string;
  const claims = typeof decoded === "string" ? { sub: decoded } : (decoded as Record<string, any>);

  // Lägg till legacy-keys så din nuvarande [id].tsx fortsätter funka
  return { ...claims, offer_id: claims.sub, offer_number: claims.no };
}
