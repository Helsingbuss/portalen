// src/lib/offerJwt.ts
// Förenklad variant utan riktig JWT – tokenen är bara offertens id/nummer.

export type SignParams = {
  offer_id: string;
  /** Giltighet i minuter (behålls bara för kompatibilitet) */
  expMinutes?: number;
};

/**
 * "Signera" offerttoken.
 * Vi behåller async-API:t men returnerar helt enkelt offer_id som sträng.
 */
export async function signOfferToken({ offer_id }: SignParams): Promise<string> {
  return String(offer_id);
}

/**
 * "Verifiera" offerttoken.
 * Vi använder token-värdet direkt som id/ärendenummer.
 */
export async function verifyOfferToken(token: string): Promise<{ offer_id: string }> {
  const id = String(token || "").trim();
  if (!id) {
    throw new Error("missing-token");
  }
  return { offer_id: id };
}

/** Hjälpare för bas-URL:er */
export function baseUrl() {
  return (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/$/, "") || "http://localhost:3000";
}

export function customerBaseUrl() {
  return (process.env.NEXT_PUBLIC_CUSTOMER_BASE_URL || baseUrl()).replace(/\/$/, "");
}
