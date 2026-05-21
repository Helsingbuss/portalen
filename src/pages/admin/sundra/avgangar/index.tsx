import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Departure = {
  id: string;
  trip_id?: string | null;
  line_id?: string | null;

  departure_date?: string | null;
  departure_time?: string | null;
  return_date?: string | null;
  return_time?: string | null;

  price?: number | null;
  capacity?: number | null;
  booked_count?: number | null;

  status?: string | null;

  sundra_trips?: {
    id: string;
    title?: string | null;
    destination?: string | null;
  } | null;

  sundra_lines?: {
    id: string;
    name?: string | null;
    code?: string | null;
    color?: string | null;
  } | null;
};

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getDepartureMonthKey(date?: string | null) {
  if (!date) return "";
  return String(date).slice(0, 7);
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatDate(date?: string | null) {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat("sv-SE", {
      dateStyle: "medium",
    }).format(new Date(`${date}T00:00:00`));
  } catch {
    return date;
  }
}

function tidyTime(value?: string | null) {
  if (!value) return "—";
  return String(value).slice(0, 5);
}

function money(value?: number | null) {
  return Number(value || 0).toLocaleString("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  });
}

function statusLabel(status?: string | null) {
  if (status === "open") return "Öppen";
  if (status === "closed") return "Stängd";
  if (status === "full") return "Fullbokad";
  if (status === "cancelled") return "Inställd";
  return status || "—";
}

function statusClass(status?: string | null) {
  if (status === "open") return "bg-green-100 text-green-700";
  if (status === "full") return "bg-orange-100 text-orange-700";
  if (status === "cancelled") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-700";
}

export default function SundraDeparturesPage() {
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

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

  function previousMonth() {
    setCurrentMonth((prev) => {
      return new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
    });
  }

  function nextMonth() {
    setCurrentMonth((prev) => {
      return new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
    });
  }

  function goToCurrentMonth() {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  const selectedMonthKey = monthKey(currentMonth);

  const filteredDepartures = useMemo(() => {
    return departures
      .filter((departure) => {
        return getDepartureMonthKey(departure.departure_date) === selectedMonthKey;
      })
      .sort((a, b) => {
        const aKey = `${a.departure_date || ""} ${a.departure_time || ""}`;
        const bKey = `${b.departure_date || ""} ${b.departure_time || ""}`;
        return aKey.localeCompare(bKey);
      });
  }, [departures, selectedMonthKey]);

  const stats = useMemo(() => {
    const capacity = filteredDepartures.reduce(
      (sum, d) => sum + Number(d.capacity || 0),
      0
    );

    const booked = filteredDepartures.reduce(
      (sum, d) => sum + Number(d.booked_count || 0),
      0
    );

    return {
      total: filteredDepartures.length,
      open: filteredDepartures.filter((d) => d.status === "open").length,
      capacity,
      booked,
      left: Math.max(0, capacity - booked),
    };
  }, [filteredDepartures]);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="space-y-6 p-6 pt-24">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[#194C66]">
                Sundra – Avgångar
              </h1>

              <p className="mt-1 text-sm text-[#194C66]/70">
                Hantera avgångar, kapacitet och bokningsläge per månad.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={loadDepartures}
                className="rounded-full border bg-white px-4 py-2 text-sm font-semibold text-[#194C66]"
              >
                Uppdatera
              </button>

              <Link
                href="/admin/sundra/avgangar/new"
                className="rounded-full bg-[#194C66] px-4 py-2 text-sm font-semibold text-white"
              >
                Skapa avgång
              </Link>
            </div>
          </div>

          <section className="rounded-3xl bg-white p-5 shadow">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <button
                onClick={previousMonth}
                className="rounded-full border bg-white px-4 py-2 text-sm font-semibold text-[#194C66] hover:bg-gray-50"
              >
                ← Föregående
              </button>

              <div className="text-center">
                <div className="text-xs uppercase tracking-wide text-[#194C66]/60">
                  Vald månad
                </div>

                <div className="text-xl font-bold capitalize text-[#194C66]">
                  {monthLabel(currentMonth)}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={goToCurrentMonth}
                  className="rounded-full border bg-white px-4 py-2 text-sm font-semibold text-[#194C66] hover:bg-gray-50"
                >
                  Idag
                </button>

                <button
                  onClick={nextMonth}
                  className="rounded-full border bg-white px-4 py-2 text-sm font-semibold text-[#194C66] hover:bg-gray-50"
                >
                  Nästa →
                </button>
              </div>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-5">
            <Stat title="Avgångar" value={stats.total} />
            <Stat title="Öppna" value={stats.open} />
            <Stat title="Kapacitet" value={stats.capacity} />
            <Stat title="Bokade" value={stats.booked} />
            <Stat title="Lediga" value={stats.left} />
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <section className="overflow-hidden rounded-3xl bg-white shadow">
            <div className="border-b p-5">
              <h2 className="text-lg font-semibold text-[#194C66]">
                Avgångar för {monthLabel(currentMonth)}
              </h2>
            </div>

            {loading ? (
              <div className="p-6 text-sm text-gray-500">Laddar avgångar...</div>
            ) : filteredDepartures.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">
                Inga avgångar finns för denna månad.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left text-sm">
                  <thead className="bg-[#f8fafc] text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-5 py-3">Resa</th>
                      <th className="px-5 py-3">Linje</th>
                      <th className="px-5 py-3">Datum</th>
                      <th className="px-5 py-3">Tid</th>
                      <th className="px-5 py-3">Retur</th>
                      <th className="px-5 py-3">Pris</th>
                      <th className="px-5 py-3">Bokade</th>
                      <th className="px-5 py-3">Lediga</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {filteredDepartures.map((departure) => {
                      const capacity = Number(departure.capacity || 0);
                      const booked = Number(departure.booked_count || 0);
                      const left = Math.max(0, capacity - booked);

                      return (
                        <tr key={departure.id} className="hover:bg-[#f8fafc]">
                          <td className="px-5 py-4">
                            <div className="font-semibold text-[#0f172a]">
                              {departure.sundra_trips?.title || "Resa saknas"}
                            </div>

                            <div className="text-xs text-gray-500">
                              {departure.sundra_trips?.destination || "—"}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            {departure.sundra_lines?.name ? (
                              <span className="rounded-full bg-[#eef5f9] px-3 py-1 text-xs font-semibold text-[#194C66]">
                                {departure.sundra_lines.name}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>

                          <td className="px-5 py-4">
                            {formatDate(departure.departure_date)}
                          </td>

                          <td className="px-5 py-4">
                            {tidyTime(departure.departure_time)}
                          </td>

                          <td className="px-5 py-4">
                            {departure.return_date
                              ? `${formatDate(departure.return_date)} kl ${tidyTime(
                                  departure.return_time
                                )}`
                              : "—"}
                          </td>

                          <td className="px-5 py-4 font-semibold text-[#194C66]">
                            {money(departure.price)}
                          </td>

                          <td className="px-5 py-4">
                            {booked}/{capacity}
                          </td>

                          <td className="px-5 py-4">{left}</td>

                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                                departure.status
                              )}`}
                            >
                              {statusLabel(departure.status)}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <Link
                              href={`/admin/sundra/avgangar/${departure.id}`}
                              className="rounded-full bg-[#194C66] px-3 py-2 text-xs font-semibold text-white"
                            >
                              Öppna
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
      <div className="mt-2 text-2xl font-bold text-[#194C66]">{value}</div>
    </div>
  );
}
