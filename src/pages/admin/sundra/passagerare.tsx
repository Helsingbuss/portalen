import { useEffect, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Passenger = {
  id: string;
  booking_id?: string;
  departure_id?: string;

  first_name?: string;
  last_name?: string;

  email?: string;
  phone?: string;

  seat_number?: string;

  trip_title?: string;
  departure_date?: string;

  boarded?: boolean;
  ticket_status?: string;

  created_at?: string;
};

export default function SundraPassengersPage() {
  const [loading, setLoading] = useState(true);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadPassengers();
  }, []);

  async function loadPassengers() {
    try {
      setLoading(true);

      const res = await fetch(
        "/api/admin/sundra/passagerare"
      );

      const json = await res.json();

      if (!json?.ok) {
        throw new Error(
          json?.error || "Kunde inte hämta passagerare."
        );
      }

      setPassengers(json.passengers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = passengers.filter((p) => {
    const q = search.toLowerCase();

    return (
      p.first_name?.toLowerCase().includes(q) ||
      p.last_name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.trip_title?.toLowerCase().includes(q) ||
      p.seat_number?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-[#194C66]">
                Passagerare
              </h1>

              <p className="text-sm text-slate-500 mt-1">
                Alla resenärer, säten och boardingstatus.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-4">
            <input
              type="text"
              placeholder="Sök namn, e-post, säte eller resa..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#194C66]"
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#194C66] text-white">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      Namn
                    </th>

                    <th className="px-4 py-3 text-left">
                      Kontakt
                    </th>

                    <th className="px-4 py-3 text-left">
                      Resa
                    </th>

                    <th className="px-4 py-3 text-left">
                      Säte
                    </th>

                    <th className="px-4 py-3 text-left">
                      Biljett
                    </th>

                    <th className="px-4 py-3 text-left">
                      Boarding
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-slate-500"
                      >
                        Laddar passagerare...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-slate-500"
                      >
                        Inga passagerare hittades.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((p) => (
                      <tr
                        key={p.id}
                        className="border-t border-slate-100 hover:bg-slate-50"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">
                            {p.first_name}{" "}
                            {p.last_name}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div>
                            {p.email || "—"}
                          </div>

                          <div className="text-xs text-slate-500">
                            {p.phone || "—"}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-medium">
                            {p.trip_title || "—"}
                          </div>

                          <div className="text-xs text-slate-500">
                            {p.departure_date || "—"}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">
                            {p.seat_number || "—"}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              p.ticket_status ===
                              "paid"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {p.ticket_status ===
                            "paid"
                              ? "Betald"
                              : "Ej betald"}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              p.boarded
                                ? "bg-blue-100 text-blue-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {p.boarded
                              ? "Ombord"
                              : "Ej scannad"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
