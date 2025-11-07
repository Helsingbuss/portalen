// src/components/drivers/DriverStatusPill.tsx
import React from "react";

export type DocTag =
  | "ok"
  | "saknas"
  | "snart (≤30d)"
  | "snart (≤60d)"
  | "snart (≤90d)"
  | "utgånget";

/** Mappa fel-encodade varianter till korrekta */
export function toDocTag(input: string): DocTag {
  const s = (input || "").trim()
    // vanliga mojibake för “≤”
    .replace("(â‰¤30d)", "(≤30d)")
    .replace("(â‰¤60d)", "(≤60d)")
    .replace("(â‰¤90d)", "(≤90d)")
    // vanliga mojibake för å/å
    .replace("utgÃ¥nget", "utgånget");

  // Fallbackar för säkerhets skull
  if (s === "ok" || s === "saknas" || s === "utgånget") return s as DocTag;
  if (s.includes("(≤30d)")) return "snart (≤30d)";
  if (s.includes("(≤60d)")) return "snart (≤60d)";
  if (s.includes("(≤90d)")) return "snart (≤90d)";

  // om något nytt värde dyker upp: behandla som “saknas”
  return "saknas";
}

export default function DriverStatusPill({
  active,
  docTag,
}: {
  active: boolean;
  docTag: DocTag;
}) {
  const label = docTag;
  const color =
    docTag === "ok"
      ? "bg-green-600"
      : docTag.startsWith("snart")
      ? "bg-amber-600"
      : docTag === "saknas" || docTag === "utgånget"
      ? "bg-red-600"
      : "bg-slate-600";

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-white text-xs ${color} ${
        active ? "" : "opacity-70"
      }`}
      title={label}
    >
      {label}
    </span>
  );
}
