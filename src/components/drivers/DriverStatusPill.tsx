// src/components/drivers/DriverStatusPill.tsx
import React from "react";

type DocTag =
  | "ok"
  | "saknas"
  | "snart (≤30d)"
  | "snart (≤60d)"
  | "snart (≤90d)"
  | "utgånget";

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
