import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

type Departure = {
  id: string;
  departure_date: string | null;
  departure_time: string | null;
  return_date: string | null;
  return_time: string | null;
  price: number | null;
  capacity: number | null;
  booked_count: number | null;
  status: string | null;
};

type Trip = {
  id: string;
  title: string;
  slug: string;
  category?: string | null;
  destination?: string | null;
  location?: string | null;
  country?: string | null;
  short_description?: string | null;
  description?: string | null;
  program?: string | null;
  included?: string | null;
  not_included?: string | null;
  terms?: string | null;
  image_url?: string | null;
  price_from?: number | null;
  currency?: string | null;
  campaign_label?: string | null;
  card_badge?: string | null;
  duration_days?: number | null;
  duration_nights?: number | null;
  facts?: string[] | null;
  highlights?: string[] | null;
  departure_points?: string[] | null;
  sundra_departures?: Departure[];
};

function money(value?: number | null, currency = "SEK") {
  if (value == null) return "—";
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function fmtDate(date?: string | null) {
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat("sv-SE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(`${date}T00:00:00`));
  } catch {
    return date;
  }
}

function fmtTime(time?: string | null) {
  if (!time) return "—";
  return String(time).slice(0, 5);
}

function seatsLeft(dep: Departure) {
  return Math.max(0, Number(dep.capacity || 0) - Number(dep.booked_count || 0));
}

export default function PublicTripPage() {
  const router = useRouter();
  const { slug } = router.query;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDeparture, setSelectedDeparture] = useState<Departure | null>(
    null
  );

  useEffect(() => {
    if (!slug || typeof slug !== "string") return;

    async function loadTrip() {
      setLoading(true);

      try {
        const res = await fetch(`/api/public/sundra/trips?type=all`);
        const json = await res.json();

        const found = (json.trips || []).find((t: Trip) => t.slug === slug);

        if (found) {
          setTrip(found);
          const firstOpen =
            found.sundra_departures?.find((d: Departure) => d.status === "open") ||
            found.next_departure ||
            null;

          setSelectedDeparture(firstOpen);
        }
      } finally {
        setLoading(false);
      }
    }

    loadTrip();
  }, [slug]);

  const departures = useMemo(() => {
    const list = trip?.sundra_departures || [];
    return list
      .filter((d) => d.status === "open")
      .sort((a, b) =>
        String(a.departure_date || "").localeCompare(
          String(b.departure_date || "")
        )
      );
  }, [trip]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f4f0] p-8">
        <div className="mx-auto max-w-6xl rounded-2xl bg-white p-6 shadow">
          Laddar resa...
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-[#f5f4f0] p-8">
        <div className="mx-auto max-w-6xl rounded-2xl bg-white p-6 shadow">
          Resan hittades inte.
        </div>
      </div>
    );
  }

  const price =
    selectedDeparture?.price || trip.price_from || 0;

  return (
    <div className="min-h-screen bg-[#f5f4f0] text-[#0f172a]">
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3 text-sm text-[#194C66]/70">
          <span>1 Välj resa</span>
          <span>›</span>
          <span>2 Tillval</span>
          <span>›</span>
          <span>3 Personuppgifter</span>
          <span>›</span>
          <span>4 Bekräftelse</span>
        </div>

        <section className="overflow-hidden rounded-3xl bg-white shadow">
          <div className="grid gap-0 lg:grid-cols-[1fr_420px]">
            <div className="relative min-h-[360px] bg-[#194C66]">
              {trip.image_url ? (
                <Image
                  src={trip.image_url}
                  alt={trip.title}
                  fill
                  className="object-cover"
                  priority
                />
              ) : null}

              <div className="absolute left-5 top-5 flex gap-2">
                {trip.card_badge && (
                  <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-[#194C66]">
                    {trip.card_badge}
                  </span>
                )}

                {trip.campaign_label && (
                  <span className="rounded-full bg-red-600 px-3 py-1 text-sm font-semibold text-white">
                    {trip.campaign_label}
                  </span>
                )}
              </div>
            </div>

            <div className="p-6 lg:p-8">
              <div className="text-sm font-semibold uppercase tracking-wide text-[#194C66]/70">
                {trip.category || "Sundra resa"}
              </div>

              <h1 className="mt-2 text-3xl font-bold leading-tight">
                {trip.title}
              </h1>

              <p className="mt-3 text-[15px] leading-relaxed text-gray-600">
                {trip.short_description || trip.description}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <Info label="Destination" value={trip.destination || "—"} />
                <Info label="Land" value={trip.country || "—"} />
                <Info
                  label="Reslängd"
                  value={`${trip.duration_days || 1} dagar`}
                />
                <Info
                  label="Nätter"
                  value={`${trip.duration_nights || 0} nätter`}
                />
              </div>

              <div className="mt-6 rounded-2xl bg-[#eef5f9] p-5">
                <div className="text-sm text-[#194C66]/70">Totalpris från</div>
                <div className="mt-1 text-3xl font-bold text-[#194C66]">
                  {money(price, trip.currency || "SEK")}
                </div>
                <div className="mt-1 text-xs text-[#194C66]/60">
                  Priset kan ändras beroende på datum och tillval.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl bg-white p-6 shadow">
          <h2 className="text-2xl font-bold text-[#194C66]">Priskalender</h2>
          <p className="mt-1 text-sm text-gray-500">
            Välj ett datum för att gå vidare med bokningen.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {departures.length === 0 ? (
              <div className="rounded-xl border p-4 text-sm text-gray-500">
                Inga bokningsbara datum finns just nu.
              </div>
            ) : (
              departures.map((dep) => {
                const left = seatsLeft(dep);
                const active = selectedDeparture?.id === dep.id;

                return (
                  <button
                    key={dep.id}
                    onClick={() => setSelectedDeparture(dep)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-[#194C66] bg-[#eef5f9]"
                        : "border-gray-200 bg-white hover:bg-[#f8fafc]"
                    }`}
                  >
                    <div className="font-semibold text-[#0f172a]">
                      {fmtDate(dep.departure_date)}
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      Avresa kl {fmtTime(dep.departure_time)}
                    </div>
                    <div className="mt-3 text-lg font-bold text-[#194C66]">
                      {money(dep.price || trip.price_from, trip.currency || "SEK")}
                    </div>
                    <div
                      className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        left <= 5
                          ? "bg-red-100 text-red-700"
                          : left <= 15
                          ? "bg-orange-100 text-orange-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {left} platser kvar
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <ContentBlock title="Om resan" content={trip.description} />
            <ContentBlock title="Reseprogram" content={trip.program} />
            <ContentBlock title="Detta ingår" content={trip.included} />
            <ContentBlock title="Bra att veta" content={trip.terms} />
          </div>

          <aside className="h-fit rounded-3xl bg-white p-6 shadow sticky top-6">
            <h2 className="text-xl font-bold text-[#194C66]">
              Din resa - översikt
            </h2>

            <div className="mt-4 space-y-3 text-sm">
              <Summary label="Resa" value={trip.title} />
              <Summary
                label="Datum"
                value={fmtDate(selectedDeparture?.departure_date)}
              />
              <Summary
                label="Avresa"
                value={fmtTime(selectedDeparture?.departure_time)}
              />
              <Summary
                label="Retur"
                value={fmtDate(selectedDeparture?.return_date)}
              />
              <Summary
                label="Pris"
                value={money(price, trip.currency || "SEK")}
              />
            </div>

            <button
              disabled={!selectedDeparture}
              onClick={() =>
                router.push(`/boka/${selectedDeparture?.id}`)
              }
              className="mt-6 w-full rounded-full bg-[#194C66] px-5 py-3 font-semibold text-white hover:bg-[#16384d] disabled:opacity-50"
            >
              Nästa steg
            </button>
          </aside>
        </section>
      </main>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#f8fafc] p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between gap-4 border-b pb-2">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-semibold">{value || "—"}</span>
    </div>
  );
}

function ContentBlock({
  title,
  content,
}: {
  title: string;
  content?: string | null;
}) {
  if (!content) return null;

  return (
    <section className="rounded-3xl bg-white p-6 shadow">
      <h2 className="text-xl font-bold text-[#194C66]">{title}</h2>
      <div className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-gray-700">
        {content}
      </div>
    </section>
  );
}
