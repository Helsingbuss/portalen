// src/lib/urls.ts
export function getPublicBaseUrl(fallbackHost?: string) {
  const env = process.env.NEXT_PUBLIC_PUBLIC_BASE_URL || process.env.PUBLIC_BASE_URL;
  if (env) return env.replace(/\/+$/, "");

  if (fallbackHost) return `https://${fallbackHost.replace(/\/+$/, "")}`;

  return "https://login.helsingbuss.se";
}

// Offertlänk – OBS: din publika sida ligger under /offert/[id]
export function makeOfferLink(idOrNumber: string, token: string, base?: string) {
  const b = (base || getPublicBaseUrl()).replace(/\/+$/, "");

  // ✅ Skicka både token och t så /offert/[id].tsx alltid hittar det
  return `${b}/offert/${encodeURIComponent(idOrNumber)}?token=${encodeURIComponent(
    token
  )}&t=${encodeURIComponent(token)}`;
}
