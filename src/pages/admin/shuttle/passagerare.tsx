import { useEffect, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

export default function ShuttlePassengersPage() {
  const [passengers, setPassengers] = useState<any[]>([]);

  useEffect(() => {
    loadPassengers();
  }, []);

  async function loadPassengers() {
    const res = await fetch("/api/admin/shuttle/passengers");
    const json = await res.json();

    setPassengers(json.passengers || []);
  }

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="p-6 pt-24">
          <div className="rounded-3xl bg-white shadow">
            <div className="border-b p-5">
              <h1 className="text-2xl font-semibold text-[#194C66]">
                Passagerare
              </h1>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left">
                <thead className="bg-[#f8fafc] text-sm text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Namn</th>
                    <th className="px-4 py-3">Mail</th>
                    <th className="px-4 py-3">Telefon</th>
                    <th className="px-4 py-3">Resor</th>
                    <th className="px-4 py-3">Totalt spenderat</th>
                  </tr>
                </thead>

                <tbody>
                  {passengers.map((p) => (
                    <tr key={p.id} className="border-b">
                      <td className="px-4 py-3 font-semibold">
                        {p.customer_name}
                      </td>

                      <td className="px-4 py-3">
                        {p.customer_email || "—"}
                      </td>

                      <td className="px-4 py-3">
                        {p.customer_phone || "—"}
                      </td>

                      <td className="px-4 py-3">
                        {p.total_trips || 0}
                      </td>

                      <td className="px-4 py-3">
                        {Number(p.total_spent || 0).toLocaleString(
                          "sv-SE"
                        )}{" "}
                        kr
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
