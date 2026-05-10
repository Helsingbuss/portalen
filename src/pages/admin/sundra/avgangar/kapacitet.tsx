import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Departure = {
  id: string;
  departure_date?: string | null;
  departure_time?: string | null;
  return_date?: string | null;
  return_time?: string | null;
  price?: number | null;
  capacity?: number | null;
  booked_count?: number | null;
  status?: string | null;
  sundra_trips?: {
    title?: string | null;
    destination?: string | null;
  } | null;
};

function fmtDate(date?: string | null) {
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat("sv-SE", { dateStyle: "medium" }).format(
      new Date(`${date}T00:00:00`)
    );
  } catch {
    return date;
  }
}

function fmtTime(time?: string | null) {
  if (!time) return "—";
  return String(time).slice(0, 5);
}

function percent(booked: number, capacity: number) {
  if (!capacity) return 0;
  return Math.min(100, Math.round((booked / capacity) * 100));
}

function barColor(p: number) {
  if (p >= 90) return "bg-red-500";
  if (p >= 70) return "bg-amber-500";
  return "bg-green-500";
}

export default function SundraCapacityPage() {
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDepartures() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/sundra/departures");
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Kunde inte hämta avgångar.");
      }

      setDepartures(json.departures || []);
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDepartures();
  }, []);

  const stats = useMemo(() => {
    const capacity = departures.reduce(
      (sum, d) => sum + Number(d.capacity || 0),
      0
    );

    const booked = departures.reduce(
      (sum, d) => sum + Number(d.booked_count || 0),
      0
    );

    const open = departures.filter((d) => d.status === "open").length;

    return {
      departures: departures.length,
      open,
      capacity,
      booked,
      left: Math.max(0, capacity - booked),
      occupancy: percent(booked, capacity),
    };
  }, [departures]);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="space-y-6 p-6 pt-24">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[#194C66]">
                Kapacitet / beläggning
              </h1>
              <p className="mt-1 text-sm text-[#194C66]/70">
                Se platser, bokningar och beläggning per avgång.
              </p>
            </div>

            <button
              onClick={loadDepartures}
              className="rounded-full bg-[#194C66] px-5 py-2 text-sm font-semibold text-white"
            >
              Uppdatera
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-5">
            <Stat title="Avgångar" value={stats.departures} />
            <Stat title="Öppna" value={stats.open} />
            <Stat title="Kapacitet" value={stats.capacity} />
            <Stat title="Bokade" value={stats.booked} />
            <Stat title="Lediga" value={stats.left} />
          </div>

          <section className="rounded-3xl bg-white p-6 shadow">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[#194C66]">
                  Total beläggning
                </h2>
                <p className="text-sm text-gray-500">
                  Samlad beläggning för alla avgångar.
                </p>
              </div>

              <div className="text-3xl font-bold text-[#194C66]">
                {stats.occupancy}%
              </div>
            </div>

            <div className="mt-5 h-4 overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full ${barColor(stats.occupancy)}`}
                style={{ width: `${stats.occupancy}%` }}
              />
            </div>
          </section>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <section className="rounded-3xl bg-white shadow">
            <div className="border-b p-5">
              <h2 className="text-lg font-semibold text-[#194C66]">
                Beläggning per avgång
              </h2>
            </div>

            {loading ? (
              <div className="p-6 text-sm text-gray-500">
                Laddar kapacitet...
              </div>
            ) : departures.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">
                Inga avgångar hittades.
              </div>
            ) : (
              <div className="divide-y">
                {departures.map((d) => {
                  const booked = Number(d.booked_count || 0);
                  const capacity = Number(d.capacity || 0);
                  const left = Math.max(0, capacity - booked);
                  const p = percent(booked, capacity);

                  return (
                    <div key={d.id} className="p-5 hover:bg-[#f8fafc]">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-[#0f172a]">
                            {d.sundra_trips?.title || "Sundra resa"}
                          </h3>

                          <p className="mt-1 text-sm text-gray-500">
                            {d.sundra_trips?.destination || "—"} ·{" "}
                            {fmtDate(d.departure_date)} kl{" "}
                            {fmtTime(d.departure_time)}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/admin/sundra/avgangar/${d.id}`}
                            className="rounded-full border bg-white px-4 py-2 text-xs font-semibold text-[#194C66]"
                          >
                            Öppna
                          </Link>

                          <Link
                            href={`/admin/sundra/boarding/${d.id}`}
                            className="rounded-full bg-[#0f766e] px-4 py-2 text-xs font-semibold text-white"
                          >
                            Boarding
                          </Link>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-4 md:grid-cols-[1fr_220px]">
                        <div>
                          <div className="mb-2 flex justify-between text-sm">
                            <span className="text-gray-500">
                              Beläggning {p}%
                            </span>
                            <span className="font-semibold text-[#194C66]">
                              {booked}/{capacity} bokade
                            </span>
                          </div>

                          <div className="h-4 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className={`h-full rounded-full ${barColor(p)}`}
                              style={{ width: `${p}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center">
                          <Mini title="Bokade" value={booked} />
                          <Mini title="Lediga" value={left} />
                          <Mini title="Total" value={capacity} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>
    </>
  );
}

function Stat({ title, value }: { title: string; value: any }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-2 text-3xl font-bold text-[#194C66]">{value}</div>
    </div>
  );
}

function Mini({ title, value }: { title: string; value: any }) {
  return (
    <div className="rounded-2xl bg-[#f8fafc] p-3">
      <div className="text-lg font-bold text-[#194C66]">{value}</div>
      <div className="text-xs text-gray-500">{title}</div>
    </div>
  );
}


