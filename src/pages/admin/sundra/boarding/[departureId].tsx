import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type BoardingData = {
  departure?: any;
  trip?: any;
  bookings?: any[];
  passengers?: any[];
  stats?: {
    passengers_total?: number;
    checked_in_total?: number;
    remaining_total?: number;
    bookings_total?: number;
  };
};

function percent(a: number, b: number) {
  if (!b) return 0;
  return Math.round((a / b) * 100);
}

function fmtDate(date?: string | null) {
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat("sv-SE", {
      dateStyle: "medium",
    }).format(new Date(`${date}T00:00:00`));
  } catch {
    return date;
  }
}

function fmtTime(time?: string | null) {
  if (!time) return "—";
  return String(time).slice(0, 5);
}

export default function BoardingPage() {
  const router = useRouter();

  const { departureId } = router.query;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [data, setData] = useState<BoardingData>({});

  async function loadBoarding() {
    try {
      if (!departureId) return;

      setLoading(true);
      setError("");

      const res = await fetch(
        `/api/admin/sundra/boarding/${departureId}`
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(
          json?.error || "Kunde inte hämta boardingläge."
        );
      }

      setData(json);
    } catch (e: any) {
      setError(e?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBoarding();
  }, [departureId]);

  const stats = useMemo(() => {
    return {
      total: Number(data?.stats?.passengers_total || 0),
      checked: Number(data?.stats?.checked_in_total || 0),
      remaining: Number(data?.stats?.remaining_total || 0),
      bookings: Number(data?.stats?.bookings_total || 0),
    };
  }, [data]);

  const checkedPercent = percent(
    stats.checked,
    stats.total
  );

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="space-y-6 p-6 pt-24">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[#194C66]">
                Boardingläge
              </h1>

              <p className="mt-1 text-sm text-[#194C66]/70">
                Liveöversikt för avgång och incheckning.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={loadBoarding}
                className="rounded-full border bg-white px-4 py-2 text-sm font-semibold text-[#194C66]"
              >
                Uppdatera
              </button>

              <Link
                href="/admin/sundra/scanner"
                className="rounded-full bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white"
              >
                Öppna scanner
              </Link>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <section className="rounded-3xl bg-white p-6 shadow">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold text-[#0f172a]">
                  {data?.trip?.title || "Sundra resa"}
                </h2>

                <div className="mt-2 space-y-1 text-sm text-gray-500">
                  <div>
                    Destination:{" "}
                    {data?.trip?.destination || "—"}
                  </div>

                  <div>
                    Avgång:{" "}
                    {fmtDate(
                      data?.departure?.departure_date
                    )}{" "}
                    kl{" "}
                    {fmtTime(
                      data?.departure?.departure_time
                    )}
                  </div>

                  <div>
                    Retur:{" "}
                    {fmtDate(data?.departure?.return_date)} kl{" "}
                    {fmtTime(data?.departure?.return_time)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <CardStat
                  title="Bokningar"
                  value={stats.bookings}
                />

                <CardStat
                  title="Passagerare"
                  value={stats.total}
                />

                <CardStat
                  title="Incheckade"
                  value={stats.checked}
                />

                <CardStat
                  title="Kvar"
                  value={stats.remaining}
                />
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  Boardingstatus
                </span>

                <span className="font-semibold text-[#194C66]">
                  {checkedPercent}% incheckade
                </span>
              </div>

              <div className="h-4 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-[#0f766e]"
                  style={{
                    width: `${checkedPercent}%`,
                  }}
                />
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl bg-white shadow">
            <div className="border-b p-5">
              <h2 className="text-lg font-semibold text-[#194C66]">
                Passagerarlista
              </h2>
            </div>

            {loading ? (
              <div className="p-6 text-sm text-gray-500">
                Laddar boarding...
              </div>
            ) : !data?.passengers?.length ? (
              <div className="p-6 text-sm text-gray-500">
                Inga passagerare hittades.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-left text-sm">
                  <thead className="bg-[#f8fafc] text-xs uppercase text-gray-500">
                    <tr>
                      <th className="p-4">Passagerare</th>
                      <th className="p-4">Bokning</th>
                      <th className="p-4">Plats</th>
                      <th className="p-4">Biljettyp</th>
                      <th className="p-4">Betalning</th>
                      <th className="p-4">Incheckning</th>
                      <th className="p-4">Notering</th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.passengers.map((p: any) => {
                      const checked =
                        Number(p.checked_in_count || 0) > 0;

                      return (
                        <tr
                          key={p.id}
                          className={`border-t ${
                            checked
                              ? "bg-green-50"
                              : "bg-white"
                          }`}
                        >
                          <td className="p-4">
                            <div className="font-semibold text-[#0f172a]">
                              {p.first_name} {p.last_name}
                            </div>

                            <div className="text-xs text-gray-500">
                              {p.customer_name || "—"}
                            </div>
                          </td>

                          <td className="p-4 font-medium">
                            {p.booking_number || "—"}
                          </td>

                          <td className="p-4">
                            {p.seat_number || "—"}
                          </td>

                          <td className="p-4">
                            {p.passenger_type || "Vuxen"}
                          </td>

                          <td className="p-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                p.payment_status === "paid"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {p.payment_status === "paid"
                                ? "Betald"
                                : "Obetald"}
                            </span>
                          </td>

                          <td className="p-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                checked
                                  ? "bg-[#0f766e] text-white"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {checked
                                ? "Incheckad"
                                : "Ej incheckad"}
                            </span>
                          </td>

                          <td className="p-4 text-xs text-gray-500">
                            {p.special_requests || "—"}
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

function CardStat({
  title,
  value,
}: {
  title: string;
  value: any;
}) {
  return (
    <div className="rounded-2xl bg-[#f8fafc] p-4 text-center">
      <div className="text-2xl font-bold text-[#194C66]">
        {value}
      </div>

      <div className="mt-1 text-xs text-gray-500">
        {title}
      </div>
    </div>
  );
}


