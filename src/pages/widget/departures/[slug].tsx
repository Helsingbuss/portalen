// src/pages/widget/departures/[slug].tsx
import { GetServerSideProps } from "next";
import Head from "next/head";
import { useState } from "react";
import * as admin from "@/lib/supabaseAdmin";

const supabase: any =
  (admin as any).supabaseAdmin ||
  (admin as any).supabase ||
  (admin as any).default;

type RawDeparture = {
  dep_date?: string;
  depart_date?: string;
  date?: string;
  day?: string;
  when?: string;
  dep_time?: string;
  time?: string;
  line_name?: string;
  line?: string;
  stops?: string[] | string | null;
};

type TripRow = {
  id: string;
  title: string;
  subtitle?: string | null;
  price_from?: number | null;
  departures?: RawDeparture[] | string | null;
  departures_coming_soon?: boolean | null;
};

type SeatsRow = {
  depart_date: string | null;
  seats_total: number | null;
  seats_reserved: number | null;
};

type WidgetDeparture = {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  line: string;
  stops: string[];
  avresaLabel: string; // "2026-02-07 Lör"
  priceLabel: string;  // "295:-"
  seatsLabel: string;  // "Slut" | ">8" | "5" | "–"
  isFull: boolean;
};

type Props = {
  slug: string;
  tripTitle: string;
  priceFromLabel: string;
  departuresComingSoon: boolean;
  departures: WidgetDeparture[];
};

function formatAvresaLabel(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return dateStr;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const base = `${y}-${m}-${day}`;

  const weekday = d.toLocaleDateString("sv-SE", {
    weekday: "short",
  });
  const w =
    weekday.length > 0
      ? weekday.charAt(0).toUpperCase() + weekday.slice(1)
      : "";
  return `${base} ${w}`;
}

function normalizeStops(stops: RawDeparture["stops"]): string[] {
  if (!stops) return [];
  if (Array.isArray(stops)) {
    return stops.map((s) => String(s).trim()).filter(Boolean);
  }
  return String(stops)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const slug = String(ctx.params?.slug || "").trim();
  if (!slug) {
    return { notFound: true };
  }

  // Hämta resa
  const { data: trip, error } = await supabase
    .from("trips")
    .select(
      "id, title, subtitle, price_from, departures, departures_coming_soon"
    )
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (error || !trip) {
    console.error("widget slug not found:", error);
    return { notFound: true };
  }

  const t = trip as TripRow;

  // Hämta kapacitet per datum
  const { data: seatRows } = await supabase
    .from("trip_departures")
    .select("depart_date, seats_total, seats_reserved")
    .eq("trip_id", t.id);

  const seatsMap = new Map<string, { label: string; isFull: boolean }>();
  (seatRows as SeatsRow[] | null | undefined)?.forEach((row) => {
    const date = row.depart_date
      ? String(row.depart_date).slice(0, 10)
      : "";
    if (!date) return;

    const total = row.seats_total ?? 0;
    const reserved = row.seats_reserved ?? 0;

    if (total <= 0) {
      seatsMap.set(date, { label: "–", isFull: false });
      return;
    }

    const remaining = Math.max(total - reserved, 0);
    if (remaining <= 0) {
      seatsMap.set(date, { label: "Slut", isFull: true });
    } else if (remaining > 8) {
      seatsMap.set(date, { label: ">8", isFull: false });
    } else {
      seatsMap.set(date, { label: String(remaining), isFull: false });
    }
  });

  // Normalisera departures från trips.departures (JSONB)
  let rawDepartures: RawDeparture[] = [];
  if (Array.isArray(t.departures)) {
    rawDepartures = t.departures as RawDeparture[];
  } else if (typeof t.departures === "string") {
    try {
      const parsed = JSON.parse(t.departures);
      if (Array.isArray(parsed)) rawDepartures = parsed as RawDeparture[];
    } catch {
      // ignore
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  const priceFromLabel =
    t.price_from != null
      ? `${Math.round(Number(t.price_from)).toLocaleString("sv-SE")}:-`
      : "—";

  const departures: WidgetDeparture[] = rawDepartures
    .map((r, idx) => {
      const date =
        (r.dep_date ||
          r.depart_date ||
          r.date ||
          r.day ||
          r.when ||
          "") as string;
      const d = String(date).slice(0, 10);
      if (!d) return null;

      const time = String(r.dep_time || r.time || "").slice(0, 5);
      const line = String(r.line_name || r.line || "").trim();
      const stops = normalizeStops(r.stops);

      const seats = seatsMap.get(d) || { label: ">8", isFull: false };

      return {
        id: `${d}-${time || "00:00"}-${idx}`,
        date: d,
        time,
        line,
        stops,
        avresaLabel: formatAvresaLabel(d),
        priceLabel: priceFromLabel,
        seatsLabel: seats.label,
        isFull: seats.isFull,
      } as WidgetDeparture;
    })
    .filter(Boolean) as WidgetDeparture[];

  // Sortera och filtrera kommande
  departures.sort((a, b) => {
    const aKey = `${a.date}T${a.time || "00:00"}`;
    const bKey = `${b.date}T${b.time || "00:00"}`;
    return aKey.localeCompare(bKey);
  });

  const upcoming = departures.filter((d) => d.date >= todayStr);

  return {
    props: {
      slug,
      tripTitle: t.title,
      priceFromLabel,
      departuresComingSoon: !!t.departures_coming_soon,
      departures: upcoming,
    },
  };
};

export default function WidgetDeparturesPage(props: Props) {
  const { tripTitle, departures, departuresComingSoon, priceFromLabel } = props;

  const [info, setInfo] = useState<{
    title: string;
    stops: string[];
  } | null>(null);

  const [activeLine, setActiveLine] = useState<string>("ALL");

  // unika linjenamn för filterknapparna
  const lineNames = Array.from(
    new Set(
      departures
        .map((d) => d.line)
        .filter((x): x is string => !!x && x.trim().length > 0)
    )
  ).sort();

  const filteredDepartures =
    activeLine === "ALL"
      ? departures
      : departures.filter((d) => d.line === activeLine);

  const buttonClass = (value: string) =>
    [
      "px-3 py-1.5 rounded-full text-xs font-medium border transition",
      value === activeLine
        ? "bg-[#194C66] text-white border-[#194C66]"
        : "bg-transparent text-[#194C66] border-slate-300 hover:bg-slate-100",
    ].join(" ");

  return (
    <>
      <Head>
        <title>{tripTitle} – avgångar | Helsingbuss</title>
      </Head>

      {/* HEL sida vit, ingen beige bakgrund, inget stort kort */}
      <div className="min-h-screen bg-white py-8 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header över tabellen */}
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h1 className="text-base sm:text-lg font-semibold text-slate-900">
                Kommande avgångar
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">{tripTitle}</p>
            </div>
            {priceFromLabel && priceFromLabel !== "—" && (
              <div className="text-xs sm:text-sm text-slate-600">
                Pris från{" "}
                <span className="font-semibold text-slate-900">
                  {priceFromLabel}
                </span>
              </div>
            )}
          </div>

          {/* Info om att datum kommer senare / inga avgångar */}
          {departuresComingSoon && departures.length === 0 && (
            <div className="py-4 text-sm text-slate-700">
              Avgångsorter och datum kommer inom kort.
            </div>
          )}

          {!departuresComingSoon && departures.length === 0 && (
            <div className="py-4 text-sm text-slate-700">
              Inga kommande avgångar är upplagda för den här resan ännu.
            </div>
          )}

          {departures.length > 0 && (
            <>
              {/* Knappar: Visa alla + Linje 1, Linje 2, ... */}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={buttonClass("ALL")}
                  onClick={() => setActiveLine("ALL")}
                >
                  Visa alla resor
                </button>
                {lineNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className={buttonClass(name)}
                    onClick={() => setActiveLine(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>

              {/* Själva tabellen – utan kortbakgrund, bara rader */}
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      <th className="px-3 py-2 text-left w-10">
                        <span className="sr-only">Info</span>
                      </th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">
                        Avresa
                      </th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">
                        Linje
                      </th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">
                        Resmål
                      </th>
                      <th className="px-3 py-2 text-right whitespace-nowrap">
                        Pris från
                      </th>
                      <th className="px-3 py-2 text-right whitespace-nowrap">
                        Platser kvar
                      </th>
                      <th className="px-3 py-2 text-right w-32"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDepartures.map((d, idx) => {
                      const resmal =
                        d.time && d.time.length
                          ? `${tripTitle} ${d.time}`
                          : tripTitle;

                      const isFull = d.isFull;
                      const buttonLabel = isFull ? "Väntelista" : "Boka";

                      return (
                        <tr
                          key={d.id}
                          className="border-b last:border-0 bg-white hover:bg-slate-50/80 transition-colors"
                        >
                          {/* Info-ikon */}
                          <td className="px-3 py-3 align-middle">
                            <button
                              type="button"
                              onClick={() =>
                                setInfo({
                                  title: `${d.avresaLabel}${
                                    d.time ? ` – ${d.time}` : ""
                                  }`,
                                  stops: d.stops,
                                })
                              }
                              className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#0056A3] text-white text-xs font-semibold shadow-sm hover:bg-[#00427c] focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#0056A3]"
                              aria-label="Visa påstigningsplatser"
                            >
                              i
                            </button>
                          </td>

                          {/* Avresa */}
                          <td className="px-3 py-3 align-middle whitespace-nowrap text-slate-900">
                            {d.avresaLabel}
                          </td>

                          {/* Linje */}
                          <td className="px-3 py-3 align-middle whitespace-nowrap text-slate-900">
                            {d.line || "–"}
                          </td>

                          {/* Resmål */}
                          <td className="px-3 py-3 align-middle text-slate-900">
                            {resmal}
                          </td>

                          {/* Pris från */}
                          <td className="px-3 py-3 align-middle text-right text-slate-900 font-semibold">
                            {d.priceLabel}
                          </td>

                          {/* Platser kvar */}
                          <td className="px-3 py-3 align-middle text-right text-slate-900">
                            {d.seatsLabel}
                          </td>

                          {/* Boka / Väntelista */}
                          <td className="px-3 py-3 align-middle text-right">
                            <button
                              type="button"
                              className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm transition-colors ${
                                isFull
                                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                                  : "bg-[#0066CC] hover:bg-[#0052a3] text-white"
                              }`}
                            >
                              {buttonLabel}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Popup med hållplatser */}
        {info && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Påstigningsplatser
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {info.title}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInfo(null)}
                  className="text-slate-500 hover:text-slate-800 text-xl leading-none px-1"
                  aria-label="Stäng"
                >
                  ×
                </button>
              </div>
              <div className="px-5 py-4 text-sm text-slate-700">
                {info.stops.length === 0 && (
                  <p>Inga hållplatser registrerade för denna avgång.</p>
                )}
                {info.stops.length > 0 && (
                  <ul className="space-y-1">
                    {info.stops.map((s, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-[6px] w-1.5 h-1.5 rounded-full bg-[#194C66]" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
