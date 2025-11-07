// src/lib/publicOrigin.ts
export function publicOrigin(kind: "offer" | "default" = "default") {
  const kund = process.env.NEXT_PUBLIC_PUBLIC_ORIGIN_KUND; // t.ex. https://kund.helsingbuss.se
  const base = process.env.NEXT_PUBLIC_BASE_URL;           // t.ex. https://login.helsingbuss.se

  if (kind === "offer" && kund) return kund;
  return base || "http://localhost:3000";
}

// Exempel: bygga offert-lÃ¤nk fÃ¶r mail etc.
export function offerPublicUrl(idOrNumber: string) {
  return `${publicOrigin("offer")}/offert/${encodeURIComponent(idOrNumber)}`;
}

