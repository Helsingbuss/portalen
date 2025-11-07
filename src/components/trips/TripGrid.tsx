import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";

/** Typ fÃ¶r ett kort (matchar vad widget/API mappar till) */
export type TripCardProps = {
  id: string;
  title: string;
  subtitle?: string;
  image?: string | null;
  ribbon?: string | null; // rÃ¶d banderoll (valfri)
  badge?: "shopping" | "dagsresa" | "flerdagar" | string | null; // kategori-pille
  city?: string | null;
  country?: string | null;
  year?: number | null;   // NYTT â€“ fÃ¶r pillen "2025"
  price_from?: number | null;
  next_date?: string | null; // valfritt, visas ej om du inte skickar
  href?: string; // lÃ¤nk (extern/slug frÃ¥n admin)
};

function money(n?: number | null) {
  if (n == null) return "";
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(n); // "295 kr"
}

/** Ett kort i samma stil som admin-preview */
function TripCard({
  id,
  title,
  subtitle,
  image,
  ribbon,
  badge,
  city,
  country,
  year,
  price_from,
  next_date,
  href,
}: TripCardProps) {
  const Wrapper: any = href ? Link : "div";
  const wrapperProps = href ? { href, className: "block", "aria-label": title } : { className: "block" };

  return (
    <Wrapper key={id} {...wrapperProps}>
      <article className="relative overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md">
        {/* Bild 600x390 */}
        <div className="relative bg-[#f3f4f6] aspect-[600/390]">
          {image && (
            <Image
              src={image}
              alt={title}
              fill
              sizes="(min-width: 1024px) 33vw, 100vw"
              className="object-cover"
            />
          )}

          {/* Diagonal rÃ¶d banderoll (valfri) */}
          {ribbon && (
            <div
              className="absolute left-3 top-3 text-white text-sm font-semibold px-3 py-1 rounded-md"
              style={{
                background: "#ef4444",
                transform: "rotate(-10deg)",
                boxShadow: "0 2px 8px rgba(0,0,0,.15)",
              }}
            >
              {ribbon}
            </div>
          )}
        </div>

        {/* InnehÃ¥ll */}
        <div className="p-4">
          {/* Piller som i preview */}
          <div className="flex flex-wrap gap-2 text-xs">
            {badge && <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">{badge}</span>}
            {country && <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">{country}</span>}
            {year && <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">{year}</span>}
          </div>

          <div className="mt-2 text-lg font-semibold text-[#0f172a]">{title}</div>
          {subtitle && <div className="text-sm text-[#0f172a]/70">{subtitle}</div>}

          <div className="mt-3 flex items-center justify-between">
            <div className="text-sm text-[#0f172a]/60">
              {/* Visa nÃ¤sta avgÃ¥ng om du skickar in ett formatert datum (valfritt) */}
              {next_date ? <>NÃ¤sta avgÃ¥ng: <b>{next_date}</b></> : null}
              {/* Om du vill visa stad ocksÃ¥ (valfritt) */}
              {!next_date && city ? <>{city}</> : null}
            </div>

            {price_from != null && (
              <span className="text-sm font-semibold px-3 py-2 bg-[#eef2f7] rounded-full whitespace-nowrap">
                fr. {money(price_from)}
              </span>
            )}
          </div>
        </div>

        {/* klick-overlay fÃ¶r bÃ¤ttre a11y */}
        {href && <span className="absolute inset-0" aria-hidden />}
      </article>
    </Wrapper>
  );
}

/** Grid-komponent â€“ anvÃ¤nds pÃ¥ testsidan och ev. widget */
export function TripGrid({
  items,
  columns = 3,
}: {
  items: TripCardProps[];
  columns?: 3 | 4 | 5;
}) {
  const gridCls = clsx(
    "grid gap-6",
    "grid-cols-1 sm:grid-cols-2",
    columns === 3 && "lg:grid-cols-3",
    columns === 4 && "lg:grid-cols-4",
    columns === 5 && "lg:grid-cols-5"
  );

  return (
    <div className={gridCls}>
      {items.map((p) => (
        <TripCard key={p.id} {...p} />
      ))}
    </div>
  );
}

export default TripCard;

