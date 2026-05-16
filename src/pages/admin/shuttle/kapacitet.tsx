import { useEffect, useMemo, useState } from "react";

import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

export default function ShuttleCapacityPage() {
  const [departures, setDepartures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadDepartures() {
    try {
      setLoading(true);

      const res = await fetch(
        "/api/admin/shuttle/departures"
      );

      const json = await res.json();

      setDepartures(json.departures || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDepartures();
  }, []);

  const totals = useMemo(() => {
    let capacity = 0;
    let booked = 0;

    departures.forEach((d) => {
      capacity += Number(d.capacity || 0);
      booked += Number(d.booked_count || 0);
    });

    return {
      capacity,
      booked,
      left: capacity - booked,
    };
  }, [departures]);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="p-6 pt-24">
          <div>
            <h1 className="text-2xl font-semibold text-[#194C66]">
              Kapacitet / Beläggning
            </h1>

            <p className="mt-1 text-sm text-[#194C66]/70">
              Liveöversikt över flygbussavgångar.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Card
              title="Totala platser"
              value={totals.capacity}
            />

            <Card
              title="Bokade"
              value={totals.booked}
            />

            <Card
              title="Lediga"
              value={totals.left}
            />
          </div>

          <div className="mt-6 overflow-hidden rounded-3xl bg-white shadow">
            {loading ? (
              <div className="p-6 text-sm text-gray-500">
                Laddar...
              </div>
            ) : (
              <div className="divide-y">
                {departures.map((departure) => {
                  const booked = Number(
                    departure.booked_count || 0
                  );

                  const capacity = Number(
                    departure.capacity || 0
                  );

                  const left =
                    capacity - booked;

                  const percent =
                    capacity > 0
                      ? Math.round(
                          (booked / capacity) * 100
                        )
                      : 0;

                  return (
                    <div
                      key={departure.id}
                      className="p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <h2 className="text-lg font-semibold text-[#0f172a]">
                            {
                              departure
                                ?.shuttle_routes
                                ?.name
                            }
                          </h2>

                          <p className="mt-1 text-sm text-gray-500">
                            {
                              departure
                                ?.departure_date
                            }{" "}
                            kl{" "}
                            {String(
                              departure?.departure_time
                            ).slice(0, 5)}
                          </p>
                        </div>

                        <div className="min-w-[260px]">
                          <div className="mb-2 flex justify-between text-sm">
                            <span>
                              {booked}/{capacity} bokade
                            </span>

                            <span>
                              {percent}%
                            </span>
                          </div>

                          <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                            <div
                              className="h-full rounded-full bg-[#194C66]"
                              style={{
                                width: `${percent}%`,
                              }}
                            />
                          </div>

                          <div className="mt-2 text-right text-sm text-green-700">
                            {left} lediga platser
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

function Card({
  title,
  value,
}: {
  title: string;
  value: any;
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow">
      <div className="text-sm text-gray-500">
        {title}
      </div>

      <div className="mt-2 text-3xl font-bold text-[#194C66]">
        {value}
      </div>
    </div>
  );
}
