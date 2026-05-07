// src/pages/admin/sundra/avganger/index.tsx

import { useEffect, useMemo, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Departure = {
  id: string;
  trip_id?: string | null;

  title?: string | null;
  slug?: string | null;

  departure_date?: string | null;
  departure_time?: string | null;
  return_time?: string | null;

  seats_total?: number | null;
  seats_booked?: number | null;

  price?: number | null;

  status?: string | null;
  booking_open?: boolean | null;

  created_at?: string | null;
};

function money(n?: number | null) {
  if (n == null) return "—";

  return n.toLocaleString("sv-SE", {
    style: "currency",
    currency: "SEK",
  });
}

function fmtDate(date?: string | null) {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat("sv-SE", {
      dateStyle: "medium",
    }).format(new Date(date));
  } catch {
    return date;
  }
}

function tidyTime(t?: string | null) {
  if (!t) return "—";

  const s = String(t);

  if (s.includes(":")) return s.slice(0, 5);

  if (s.length >= 4) {
    return `${s.slice(0, 2)}:${s.slice(2, 4)}`;
  }

  return s;
}

function statusBadge(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "aktiv":
      return "bg-green-100 text-green-700";

    case "utkast":
      return "bg-yellow-100 text-yellow-700";

    case "inställd":
      return "bg-red-100 text-red-700";

    case "fullbokad":
      return "bg-orange-100 text-orange-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function SundraDeparturesPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Departure[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);

      const res = await fetch("/api/admin/sundra/departures");
      const json = await res.json();

      setRows(json?.departures || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return rows.filter((r) => {
      return (
        (r.title || "").toLowerCase().includes(q) ||
        (r.departure_date || "").toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  return (
    <div className="flex min-h-screen bg-[#f5f4f0]">
      <AdminMenu />

      <div className="flex flex-1 flex-col">
        <Header />

        <main className="p-6 pt-24">
          {/* TOP */}
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[#194C66]">
                Avgångar
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Hantera datum, kapacitet och bokningsstatus för resor.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Sök resa eller datum..."
                className="rounded-xl border bg-white px-4 py-2 text-sm outline-none"
              />

              <a
                href="/admin/sundra/avganger/new"
                className="rounded-xl bg-[#194C66] px-4 py-2 text-sm font-medium text-white hover:bg-[#16384d]"
              >
                + Ny avgång
              </a>
            </div>
          </div>

          {/* CARDS */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <StatCard
              title="Totala avgångar"
              value={rows.length}
            />

            <StatCard
              title="Aktiva"
              value={
                rows.filter((r) => r.status === "aktiv").length
              }
            />

            <StatCard
              title="Fullbokade"
              value={
                rows.filter((r) => r.status === "fullbokad").length
              }
            />

            <StatCard
              title="Öppna bokningar"
              value={
                rows.filter((r) => r.booking_open).length
              }
            />
          </div>

          {/* LISTA */}
          <div className="overflow-hidden rounded-2xl bg-white shadow">
            {loading ? (
              <div className="p-6 text-sm text-gray-500">
                Laddar avgångar...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">
                Inga avgångar hittades.
              </div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full min-w-[1100px] text-sm">
                  <thead className="bg-[#f8fafc] text-left">
                    <tr>
                      <th className="p-4">Resa</th>
                      <th className="p-4">Datum</th>
                      <th className="p-4">Tid</th>
                      <th className="p-4">Pris</th>
                      <th className="p-4">Beläggning</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Bokning</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filtered.map((row) => {
                      const total = row.seats_total || 0;
                      const booked = row.seats_booked || 0;

                      const percent =
                        total > 0
                          ? Math.round((booked / total) * 100)
                          : 0;

                      return (
                        <tr
                          key={row.id}
                          onClick={() => {
                            window.location.href = `/admin/sundra/avganger/${row.id}`;
                          }}
                          className="cursor-pointer border-t hover:bg-[#fafafa]"
                        >
                          <td className="p-4">
                            <div className="font-medium text-[#0f172a]">
                              {row.title || "—"}
                            </div>

                            <div className="text-xs text-gray-500">
                              {row.slug || "—"}
                            </div>
                          </td>

                          <td className="p-4">
                            {fmtDate(row.departure_date)}
                          </td>

                          <td className="p-4">
                            {tidyTime(row.departure_time)}
                            {" – "}
                            {tidyTime(row.return_time)}
                          </td>

                          <td className="p-4">
                            {money(row.price)}
                          </td>

                          <td className="p-4">
                            <div className="min-w-[180px]">
                              <div className="mb-1 flex items-center justify-between text-xs">
                                <span>
                                  {booked}/{total}
                                </span>

                                <span>
                                  {percent}%
                                </span>
                              </div>

                              <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                                <div
                                  className="h-full rounded-full bg-[#194C66]"
                                  style={{
                                    width: `${percent}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="p-4">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-medium ${statusBadge(
                                row.status
                              )}`}
                            >
                              {row.status || "—"}
                            </span>
                          </td>

                          <td className="p-4">
                            {row.booking_open ? (
                              <span className="text-green-700">
                                Öppen
                              </span>
                            ) : (
                              <span className="text-red-700">
                                Stängd
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow">
      <div className="text-sm text-gray-500">
        {title}
      </div>

      <div className="mt-2 text-3xl font-semibold text-[#194C66]">
        {value}
      </div>
    </div>
  );
}
