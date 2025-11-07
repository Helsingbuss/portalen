// src/lib/offerJwt.ts
import jwt from "jsonwebtoken";

const SECRET = process.env.OFFER_JWT_SECRET!;
if (!SECRET) {
  // kastar tidigt vid dev/build om nyckeln saknas
  throw new Error("OFFER_JWT_SECRET saknas i miljövariablerna");
}

/** Payload vi lägger i token */
export type OfferTokenPayload = {
  offer_id: string;        // offertens id
  recipient?: string;      // valfritt: e-post eller kund-id
  aud: "offer-view";       // audience-låsning
  iat?: number;
  exp?: number;
};

/** Skapa en kortlivad token (default 30 dagar) */
export function signOfferToken(
  offer_id: string,
  recipient?: string,
  ttl: string | number = "30d"
): string {
  const payload: OfferTokenPayload = {
    offer_id,
    recipient,
    aud: "offer-view",
  };
  return jwt.sign(payload, SECRET, { expiresIn: ttl });
}

/** Verifiera och returnera payload (kastar vid fel) */
export function verifyOfferToken(token: string): OfferTokenPayload {
  const decoded = jwt.verify(token, SECRET) as OfferTokenPayload;
  if (decoded.aud !== "offer-view") {
    throw new Error("Felaktig audience");
  }
  if (!decoded.offer_id) throw new Error("Token saknar offer_id");
  return decoded;
}
