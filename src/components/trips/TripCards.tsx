import React from "react";

/* ===== Typer ===== */
export type TripCardProps = {
  id: string;
  image: string;                  // URL till huvudbilden
  title: string;                  // "GekÃ¥s Ullared"
  subtitle?: string;              // ex. â€œFynda stort, res bekvÃ¤mtâ€
  location?: string;              // ex. â€œSverigeâ€
  tripKind?: "flerdagar" | "dagsresa" | "shopping";
  tripKindLabel?: string;         // skriv Ã¶ver pillens text om du vill
  year?: number;                  // 2025, 2026, 2027

  priceFrom?: number | string;    // ex. 295
  currency?: string;              // default "SEK"

  // valfritt Ã¶vrigt
  ribbon?: { text: string; color?: string; textColor?: string; angle?: number };

  // lÃ¤nk ska peka till det du sparar i admin (extern lÃ¤nk/slug)
  ctaHref?: string;
};

function kindLabel(kind?: TripCardProps["tripKind"], override?: string) {
  if (override) return override;
  switch (kind) {
    case "flerdagar": return "flerdagar";
    case "dagsresa":  return "dagsresa";
    case "shopping":  return "shopping";
    default:          return "";
  }
}

function formatPriceKr(v?: number | string, currency = "SEK") {
  if (v === undefined || v === null || v === "") return "";
  const n = typeof v === "string" ? Number(v) : v;
  if (!Number.isFinite(n)) return String(v);
  // matcha admin-preview: "fr. 295 kr"
  return n.toLocaleString("sv-SE") + (currency === "SEK" ? " kr" : ` ${currency}`);
}

/* ===== TripCard i â€œpreviewâ€-stil ===== */
export function TripCard(props: TripCardProps) {
  const {
    image, title, subtitle, location, tripKind, tripKindLabel, year,
    priceFrom, currency = "SEK",
    ctaHref = "#",
    ribbon,
  } = props;

  const priceText = priceFrom ? `fr. ${formatPriceKr(priceFrom, currency)}` : "";
  const badge = kindLabel(tripKind, tripKindLabel);
  const ribbonBg = ribbon?.color || "#ef4444";
  const ribbonFg = ribbon?.textColor || "#fff";
  const angle = ribbon?.angle ?? -10;

  return (
    <a
      href={ctaHref}
      className="group relative block rounded-2xl border bg-white shadow-sm overflow-hidden transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#194C66]/40"
    >
      {/* Bild â€“ 600x390 aspect */}
      <div className="relative bg-[#f3f4f6] aspect-[600/390]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={title} className="absolute inset-0 h-full w-full object-cover" />

        {/* Diagonal banderoll (valfri) */}
        {!!ribbon?.text && (
          <div className="absolute left-3 top-3"
               style={{ transform: `rotate(${angle}deg)` }}>
            <span
              className="inline-block px-3 py-1 text-sm font-semibold"
              style={{
                background: ribbonBg,
                color: ribbonFg,
                borderRadius: 6,
                boxShadow: "0 2px 8px rgba(0,0,0,.15)",
              }}
            >
              {ribbon.text}
            </span>
          </div>
        )}
      </div>

      {/* Textyta */}
      <div className="p-4">
        {/* smÃ¥ piller som i admin-preview */}
        <div className="flex flex-wrap gap-2 text-xs">
          {badge && <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">{badge}</span>}
          {location && <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">{location}</span>}
          {year && <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">{year}</span>}
        </div>

        <div className="mt-2 text-lg font-semibold text-[#0f172a]">{title}</div>
        {subtitle && <div className="text-sm text-[#0f172a]/70">{subtitle}</div>}

        {/* bottrad â€“ pris till hÃ¶ger i grÃ¥ â€œchipâ€ */}
        <div className="mt-3 flex items-center justify-between">
          {/* vÃ¤nstersida: lÃ¤mnas tom eller fylls med ev. datum/linje i framtiden */}
          <span className="text-sm text-[#0f172a]/60"></span>

          {priceText && (
            <span className="text-sm font-semibold px-3 py-2 bg-[#eef2f7] rounded-full whitespace-nowrap">
              {priceText}
            </span>
          )}
        </div>
      </div>

      {/* GÃ¶r hela kortet klickbart utan extra knapp */}
      <span className="absolute inset-0" aria-hidden />
    </a>
  );
}

/* ===== Grid ===== */
export function TripGrid({ items, cols = 3 }: { items: TripCardProps[]; cols?: 3 | 4 | 5 }) {
  const map: Record<3 | 4 | 5, string> = {
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
    5: "sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5",
  };
  return (
    <div className={`grid grid-cols-1 gap-6 ${map[cols]}`}>
      {items.map((it) => (
        <TripCard key={it.id} {...it} />
      ))}
    </div>
  );
}

export default TripGrid;

