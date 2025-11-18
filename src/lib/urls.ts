// src/lib/urls.ts
export function getPublicBaseUrl(fallbackHost?: string) {
  // 1) HÃ¥rdinstÃ¤lld publik bas-URL (rekommenderat fÃ¶r mail)
  const env = process.env.NEXT_PUBLIC_PUBLIC_BASE_URL || process.env.PUBLIC_BASE_URL;
  if (env) return env.replace(/\/+$/, "");

  // 2) Om du skickar frÃ¥n en SSR-kontekst kan du skicka in host frÃ¥n req.headers.host
  if (fallbackHost) return `https://${fallbackHost.replace(/\/+$/, "")}`;

  // 3) Sista utvÃ¤g: localhost (undvik i mail!)
  return "http://localhost:3000";
}

// OffertlÃ¤nk â€“ OBS: din publika sida ligger under /offert/[id]
export function makeOfferLink(offerId: string, token: string, base?: string) {
  const b = (base || getPublicBaseUrl()).replace(/\/+$/, "");
  return `${b}/offert/${encodeURIComponent(offerId)}?t=${encodeURIComponent(token)}`;
}

