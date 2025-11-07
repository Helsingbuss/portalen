// src/components/drivers/DriverStatusPill.tsx
export default function DriverStatusPill({
  active,
  docTag,
}: {
  active: boolean;
  docTag: "ok" | "saknas" | "snart (<=30d)" | "snart (<=60d)" | "snart (<=90d)" | "utgånget";
}) {
  const base =
    "inline-flex items-center px-2 py-[2px] rounded-full text-xs font-medium whitespace-nowrap";

  const activeCls = active
    ? "bg-green-100 text-green-800"
    : "bg-gray-200 text-gray-700";

  let docCls = "bg-gray-100 text-gray-800";
  if (docTag === "ok") docCls = "bg-green-100 text-green-800";
  if (docTag.startsWith("snart")) docCls = "bg-yellow-100 text-yellow-800";
  if (docTag === "utgånget") docCls = "bg-red-100 text-red-800";
  if (docTag === "saknas") docCls = "bg-gray-100 text-gray-800";

  return (
    <div className="flex items-center gap-2">
      <span className={`${base} ${activeCls}`}>{active ? "Aktiv" : "Inaktiv"}</span>
      <span className={`${base} ${docCls}`}>Dokument: {docTag}</span>
    </div>
  );
}



