// src/lib/urls.ts
export function getPublicBaseUrl(fallbackHost?: string) {
  // 1) Hårdinställd publik bas-URL (rekommenderat för mail)
  const env = process.env.NEXT_PUBLIC_PUBLIC_BASE_URL || process.env.PUBLIC_BASE_URL;
  if (env) return env.replace(/\/+$/, "");

  // 2) Om du skickar från en SSR-kontekst kan du skicka in host från req.headers.host
  if (fallbackHost) return `https://${fallbackHost.replace(/\/+$/, "")}`;

  // 3) Sista utväg: localhost (undvik i mail!)
  return "http://localhost:3000";
}

// Offertlänk – OBS: din publika sida ligger under /offert/[id]
export function makeOfferLink(offerId: string, token: string, base?: string) {
  const b = (base || getPublicBaseUrl()).replace(/\/+$/, "");
  return `${b}/offert/${encodeURIComponent(offerId)}?t=${encodeURIComponent(token)}`;
}
