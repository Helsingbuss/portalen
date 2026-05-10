import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Departure = {
  id: string;
  trip_id?: string | null;
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

function money(value?: number | null) {
  return Number(value || 0).toLocaleString("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  });
}

function statusClass(status?: string | null) {
  if (status === "open") return "bg-green-100 text-green-700";
  if (status === "closed") return "bg-red-100 text-red-700";
  if (status === "draft") return "bg-gray-100 text-gray-700";
  return "bg-amber-100 text-amber-700";
}

function statusLabel(status?: string | null) {
  if (status === "open") return "Öppen";
  if (status === "closed") return "Stängd";
  if (status === "draft") return "Utkast";
  return status || "—";
}

export default function SundraDeparturesPage() {
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
    const total = departures.length;
    const open = departures.filter((d) => d.status === "open").length;
    const booked = departures.reduce(
      (sum, d) => sum + Number(d.booked_count || 0),
      0
    );
    const capacity = departures.reduce(
      (sum, d) => sum + Number(d.capacity || 0),
      0
    );

    return {
      total,
      open,
      booked,
      capacity,
      left: Math.max(0, capacity - booked),
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
                Alla avgångar
              </h1>
              <p className="mt-1 text-sm text-[#194C66]/70">
                Hantera avgångar, kapacitet, boarding och bokningsstatus.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={loadDepartures}
                className="rounded-full border bg-white px-4 py-2 text-sm text-[#194C66]"
              >
                Uppdatera
              </button>

              <Link
                href="/admin/sundra/avgangar/new"
                className="rounded-full bg-[#194C66] px-4 py-2 text-sm font-semibold text-white"
              >
                + Skapa avgång
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Stat title="Avgångar" value={stats.total} />
            <Stat title="Öppna" value={stats.open} />
            <Stat title="Bokade platser" value={stats.booked} />
            <Stat title="Lediga platser" value={stats.left} />
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <section className="overflow-hidden rounded-3xl bg-white shadow">
            <div className="border-b p-5">
              <h2 className="text-lg font-semibold text-[#194C66]">
                Avgångslista
              </h2>
            </div>

            {loading ? (
              <div className="p-6 text-sm text-gray-500">Laddar avgångar...</div>
            ) : departures.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">
                Inga avgångar hittades.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left text-sm">
                  <thead className="bg-[#f8fafc] text-xs uppercase text-gray-500">
                    <tr>
                      <th className="p-4">Resa</th>
                      <th className="p-4">Avgång</th>
                      <th className="p-4">Retur</th>
                      <th className="p-4">Pris</th>
                      <th className="p-4">Platser</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Åtgärder</th>
                    </tr>
                  </thead>

                  <tbody>
                    {departures.map((d) => {
                      const booked = Number(d.booked_count || 0);
                      const capacity = Number(d.capacity || 0);
                      const left = Math.max(0, capacity - booked);

                      return (
                        <tr key={d.id} className="border-t hover:bg-[#f8fafc]">
                          <td className="p-4">
                            <div className="font-semibold text-[#0f172a]">
                              {d.sundra_trips?.title || "Sundra resa"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {d.sundra_trips?.destination || "—"}
                            </div>
                          </td>

                          <td className="p-4">
                            <div>{fmtDate(d.departure_date)}</div>
                            <div className="text-xs text-gray-500">
                              kl. {fmtTime(d.departure_time)}
                            </div>
                          </td>

                          <td className="p-4">
                            <div>{fmtDate(d.return_date)}</div>
                            <div className="text-xs text-gray-500">
                              kl. {fmtTime(d.return_time)}
                            </div>
                          </td>

                          <td className="p-4 font-semibold text-[#194C66]">
                            {money(d.price)}
                          </td>

                          <td className="p-4">
                            <div className="font-semibold">
                              {booked}/{capacity}
                            </div>
                            <div className="text-xs text-gray-500">
                              {left} lediga
                            </div>
                          </td>

                          <td className="p-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                                d.status
                              )}`}
                            >
                              {statusLabel(d.status)}
                            </span>
                          </td>

                          <td className="p-4">
                            <div className="flex justify-end gap-2">
                              <Link
                                href={`/admin/sundra/avgangar/${d.id}`}
                                className="rounded-full border bg-white px-3 py-2 text-xs font-semibold text-[#194C66]"
                              >
                                Öppna
                              </Link>

                              <Link
                                href={`/admin/sundra/boarding/${d.id}`}
                                className="rounded-full bg-[#0f766e] px-3 py-2 text-xs font-semibold text-white"
                              >
                                Boarding
                              </Link>
                            </div>
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
      <div className="mt-2 text-3xl font-bold text-[#194C66]">{value}</div>
    </div>
  );
}


