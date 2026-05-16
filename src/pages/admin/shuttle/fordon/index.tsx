import { useEffect, useState } from "react";
import Link from "next/link";

import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

export default function ShuttleVehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);

  useEffect(() => {
    loadVehicles();
  }, []);

  async function loadVehicles() {
    const res = await fetch(
      "/api/admin/shuttle/vehicles"
    );

    const json = await res.json();

    setVehicles(json.vehicles || []);
  }

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="p-6 pt-24">
          <div className="mb-5 flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-[#194C66]">
              Fordonslista
            </h1>

            <Link
              href="/admin/shuttle/fordon/new"
              className="rounded-xl bg-[#194C66] px-5 py-3 text-white"
            >
              Lägg till fordon
            </Link>
          </div>

          <div className="rounded-3xl bg-white shadow">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] text-left">
                <thead className="bg-[#f8fafc] text-sm text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Fordon</th>
                    <th className="px-4 py-3">Regnummer</th>
                    <th className="px-4 py-3">Operatör</th>
                    <th className="px-4 py-3">Platser</th>
                    <th className="px-4 py-3">Platskarta</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {vehicles.map((vehicle) => (
                    <tr
                      key={vehicle.id}
                      className="border-b"
                    >
                      <td className="px-4 py-3 font-semibold">
                        {vehicle.name}
                      </td>

                      <td className="px-4 py-3">
                        {vehicle.registration_number || "—"}
                      </td>

                      <td className="px-4 py-3">
                        {vehicle.operator_name || "—"}
                      </td>

                      <td className="px-4 py-3">
                        {vehicle.seats_count || 0}
                      </td>

                      <td className="px-4 py-3">
                        {vehicle.shuttle_bus_maps?.name ||
                          "Ingen vald"}
                      </td>

                      <td className="px-4 py-3">
                        {vehicle.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
