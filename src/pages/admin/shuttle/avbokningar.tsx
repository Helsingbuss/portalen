import { useEffect, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

export default function ShuttleCancellationsPage() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    const res = await fetch("/api/admin/shuttle/cancellations");
    const json = await res.json();

    setItems(json.cancellations || []);
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
                Avbokningar
              </h1>
            </div>

            <div className="divide-y">
              {items.map((item) => (
                <div key={item.id} className="p-5">
                  <div className="font-semibold">
                    {item.shuttle_tickets?.ticket_number}
                  </div>

                  <div className="mt-1 text-sm text-gray-500">
                    {item.shuttle_tickets?.customer_name}
                  </div>

                  <div className="mt-2 text-sm">
                    {item.reason || "Ingen anledning"}
                  </div>

                  <div className="mt-1 text-xs text-gray-500">
                    {item.cancellation_status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
