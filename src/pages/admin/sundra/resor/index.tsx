import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Trip = {
  id: string;
  title: string;
  category?: string | null;
  destination?: string | null;
  price_from?: number | null;
  status?: string | null;
  image_url?: string | null;
  created_at?: string | null;
};

export default function SundraTripsPage() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/sundra/trips");
        const json = await res.json();
        setTrips(Array.isArray(json?.trips) ? json.trips : []);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="p-6 pt-24 space-y-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-xl font-semibold text-[#194C66]">
                Reselista
              </h1>
              <p className="text-sm text-[#194C66]/60">
                Här ser du alla resor som är skapade i Sundra.
              </p>
            </div>

            <button
              onClick={() => router.push("/admin/sundra/resor/new")}
              className="rounded-[25px] bg-[#194C66] px-4 py-2 text-sm text-white"
            >
              + Skapa resa
            </button>
          </div>

          <div className="rounded-xl bg-white shadow overflow-hidden">
            {loading ? (
              <div className="p-6 text-sm text-gray-500">Laddar resor...</div>
            ) : trips.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">
                Inga resor skapade ännu.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-[#e5eef3] text-left text-[#194C66]">
                  <tr>
                    <th className="p-3">Resa</th>
                    <th className="p-3">Kategori</th>
                    <th className="p-3">Destination</th>
                    <th className="p-3">Pris från</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Skapad</th>
                  </tr>
                </thead>

                <tbody>
                  {trips.map((trip) => (
                    <tr
                      key={trip.id}
                      onClick={() =>
                        router.push(`/admin/sundra/resor/${trip.id}`)
                      }
                      className="border-t cursor-pointer hover:bg-[#f8fafc]"
                    >
                      <td className="p-3 font-medium text-[#0f172a]">
                        {trip.title}
                      </td>
                      <td className="p-3">{trip.category || "—"}</td>
                      <td className="p-3">{trip.destination || "—"}</td>
                      <td className="p-3">
                        {Number(trip.price_from || 0).toLocaleString("sv-SE")}{" "}
                        SEK
                      </td>
                      <td className="p-3">
                        <span className="rounded-full bg-[#eef5f9] px-3 py-1 text-xs font-semibold text-[#194C66]">
                          {trip.status || "draft"}
                        </span>
                      </td>
                      <td className="p-3">
                        {trip.created_at
                          ? new Date(trip.created_at).toLocaleDateString(
                              "sv-SE"
                            )
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
