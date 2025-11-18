// src/components/drivers/DriverStatusPill.tsx
import React from "react";

export type DocTag =
  | "ok"
  | "saknas"
  | "snart (≤30d)"
  | "snart (≤60d)"
  | "snart (≤90d)"
  | "utgånget";

/**
 * Normaliserar strängar som kan komma felkodade från API/DB, t.ex.
 *  - "snart (â‰¤30d)" -> "snart (≤30d)"
 *  - "utgÃ¥nget" -> "utgånget"
 */
export function toDocTag(input: string): DocTag {
  const s = (input || "")
    .trim()
    // Mojibake för ≤
    .replace(/â‰¤/g, "≤")
    // Mojibake för å/Å/Ä/Ö (vanliga varianter)
    .replace(/Ã¥/g, "å")
    .replace(/Ã…/g, "Å")
    .replace(/Ã¤/g, "ä")
    .replace(/Ã„/g, "Ä")
    .replace(/Ã¶/g, "ö")
    .replace(/Ã–/g, "Ö");

  const map: Record<string, DocTag> = {
    "ok": "ok",
    "saknas": "saknas",
    "snart (≤30d)": "snart (≤30d)",
    "snart (≤60d)": "snart (≤60d)",
    "snart (≤90d)": "snart (≤90d)",
    "utgånget": "utgånget",
    // Felskrivningar/felencodade varianter:
    "snart (â‰¤30d)": "snart (≤30d)",
    "snart (â‰¤60d)": "snart (≤60d)",
    "snart (â‰¤90d)": "snart (≤90d)",
    "utgÃ¥nget": "utgånget",
  };

  return (map[s] as DocTag) ?? "ok";
}

function stylesByTag(tag: DocTag) {
  switch (tag) {
    case "ok":
      return { bg: "bg-green-100", text: "text-green-800", dot: "bg-green-500" };
    case "saknas":
      return { bg: "bg-gray-100", text: "text-gray-800", dot: "bg-gray-500" };
    case "snart (≤30d)":
      return { bg: "bg-amber-100", text: "text-amber-900", dot: "bg-amber-500" };
    case "snart (≤60d)":
      return { bg: "bg-yellow-100", text: "text-yellow-900", dot: "bg-yellow-500" };
    case "snart (≤90d)":
      return { bg: "bg-sky-100", text: "text-sky-900", dot: "bg-sky-500" };
    case "utgånget":
      return { bg: "bg-red-100", text: "text-red-900", dot: "bg-red-500" };
  }
}

export default function DriverStatusPill({
  active,
  docTag,
}: {
  active: boolean;
  docTag: DocTag | string; // tillåt string men normalisera
}) {
  const tag = toDocTag(String(docTag));
  const s = stylesByTag(tag);

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${s.bg} ${s.text}`}
      title={active ? "Aktiv" : "Inaktiv"}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
      {tag}
      {!active && <span className="ml-2 text-xs opacity-80">(inaktiv)</span>}
    </span>
  );
}
