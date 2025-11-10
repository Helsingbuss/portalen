// src/components/offers/TripLegCard.tsx
import Image from "next/image";

type Props = {
  title: string;
  subtitle?: string;
  date?: string | null;
  time?: string | null;
  from?: string | null;
  to?: string | null;
  pax?: string | number | null;
  extra?: string | null;
  iconSrc?: string;
  iconSize?: number; // ← ny
};

export default function TripLegCard({
  title,
  subtitle,
  date,
  time,
  from,
  to,
  pax,
  extra,
  iconSrc = "/busie.png",
  iconSize = 32, // ← större default
}: Props) {
  const v = (x: any, f = "—") =>
    x === null || x === undefined || x === "" ? f : String(x);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-[#0f172a]">
        <Image
          src={iconSrc}
          alt="Ikon"
          width={iconSize}
          height={iconSize}
          className="shrink-0"
        />
        <span className="font-semibold">{v(title)}</span>
        {subtitle ? (
          <span className="text-xs text-[#0f172a]/50 ml-2">{subtitle}</span>
        ) : null}
      </div>

      <div className="border rounded-lg p-3 text-[14px] text-[#0f172a]" style={{ lineHeight: 1.5 }}>
        <div><span className="font-semibold">Avgång:</span> {v(date)} kl {v(time)}</div>
        <div><span className="font-semibold">Från:</span> {v(from)}</div>
        <div><span className="font-semibold">Till:</span> {v(to)}</div>
        <div><span className="font-semibold">Antal passagerare:</span> {v(pax)}</div>
        <div className="mt-1">
          <span className="font-semibold">Övrig information:</span>{" "}
          <span className="whitespace-pre-wrap">{v(extra, "Ingen information.")}</span>
        </div>
      </div>
    </div>
  );
}
