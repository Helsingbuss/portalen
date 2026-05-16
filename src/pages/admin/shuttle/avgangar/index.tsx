import { useEffect, useState } from "react";
import Link from "next/link";

import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

export default function ShuttleDeparturesPage() {
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

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="p-6 pt-24">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[#194C66]">
                Flygbuss – Avgångar
              </h1>

              <p className="mt-1 text-sm text-[#194C66]/70">
                Hantera avgångar och beläggning.
              </p>
            </div>

            <Link
              href="/admin/shuttle/avgangar/new"
              className="rounded-full bg-[#194C66] px-5 py-3 text-sm font-semibold text-white"
            >
              Skapa avgång
            </Link>
          </div>

          <div className="mt-6 overflow-hidden rounded-3xl bg-white shadow">
            {loading ? (
              <div className="p-6 text-sm text-gray-500">
                Laddar avgångar...
              </div>
            ) : departures.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">
                Inga avgångar skapade ännu.
              </div>
            ) : (
              <div className="divide-y">
                {departures.map((departure) => {
                  const booked =
                    Number(
                      departure.booked_count || 0
                    );

                  const capacity =
                    Number(
                      departure.capacity || 0
                    );

                  const left =
                    capacity - booked;

                  return (
                    <div
                      key={departure.id}
                      className="p-5 hover:bg-[#f8fafc]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h2 className="text-lg font-semibold text-[#0f172a]">
                            {
                              departure.shuttle_routes
                                ?.name
                            }
                          </h2>

                          <p className="mt-1 text-sm text-gray-500">
                            {
                              departure.shuttle_routes
                                ?.from_city
                            }{" "}
                            →{" "}
                            {
                              departure.shuttle_routes
                                ?.to_airport
                            }
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full bg-[#eef5f9] px-3 py-1 text-[#194C66]">
                              {departure.departure_date}
                            </span>

                            <span className="rounded-full bg-[#eef5f9] px-3 py-1 text-[#194C66]">
                              {String(
                                departure.departure_time
                              ).slice(0, 5)}
                            </span>

                            <span className="rounded-full bg-green-50 px-3 py-1 text-green-700">
                              {left} lediga
                            </span>

                            <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                              {capacity} platser
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-2xl font-bold text-[#194C66]">
                            {Number(
                              departure.price || 0
                            ).toLocaleString(
                              "sv-SE"
                            )}{" "}
                            kr
                          </div>

                          <div className="mt-2 text-sm text-gray-500">
                            {booked}/{capacity} bokade
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
