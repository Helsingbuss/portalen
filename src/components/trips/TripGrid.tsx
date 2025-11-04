import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";

/** Typ för ett kort (matchar vad widget/API mappar till) */
export type TripCardProps = {
  id: string;
  title: string;
  subtitle?: string;
  image?: string | null;
  ribbon?: string | null;                    // röd banderoll
  badge?: "shopping" | "dagsresa" | "flerdagar" | string | null; // lilla etiketten
  city?: string | null;
  country?: string | null;
  price_from?: number | null;
  next_date?: string | null;
  href?: string;                             // valfri länk
};

function money(n?: number | null) {
  if (n == null) return "";
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Ett kort */
function TripCard({
  id,
  title,
  subtitle,
  image,
  ribbon,
  badge,
  city,
  country,
  price_from,
  next_date,
  href,
}: TripCardProps) {
  const content = (
    <div className="bg-white rounded-2xl shadow overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative">
        {/* Bild */}
        <div className="aspect-[16/10] bg-gray-100">
          {image ? (
            <Image
              src={image}
              alt={title}
              fill
              sizes="(min-width: 1024px) 33vw, 100vw"
              className="object-cover"
            />
          ) : null}
        </div>

        {/* Röd ribbon (kampanj) */}
        {ribbon ? (
          <div className="absolute left-0 top-6 -rotate-10">
            <div className="bg-[#e74c3c] text-white text-sm font-semibold px-4 py-1 rounded-md shadow">
              {ribbon}
            </div>
          </div>
        ) : null}
      </div>

      {/* Innehåll */}
      <div className="p-4">
        {/* Liten badge över titel */}
        <div className="flex items-center gap-2 mb-1">
          {badge ? (
            <span className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-[#194C66]/10 text-[#194C66] font-medium">
              {badge}
            </span>
          ) : null}
          {(city || country) && (
            <span className="text-xs text-slate-500">
              {city ? `${city}, ` : ""}
              {country ?? ""}
            </span>
          )}
        </div>

        <div className="text-lg font-semibold text-slate-900">{title}</div>
        {subtitle ? (
          <div className="text-sm text-slate-600 mt-1">{subtitle}</div>
        ) : null}

        <div className="mt-4 flex items-end justify-between">
          <div className="text-sm text-slate-600">
            {next_date ? (
              <>
                Nästa avgång <span className="font-medium text-slate-800">{next_date}</span>
              </>
            ) : (
              "Flera datum"
            )}
          </div>
          {price_from != null && (
            <div className="px-3 py-1.5 rounded-full bg-[#194C66] text-white text-sm font-semibold">
              fr. {money(price_from)}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Länkbar eller inte
  return href ? (
    <Link href={href} className="block" aria-label={title} key={id}>
      {content}
    </Link>
  ) : (
    <div key={id}>{content}</div>
  );
}

/** Grid-komponent – används på testsidan och ev. widget */
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
