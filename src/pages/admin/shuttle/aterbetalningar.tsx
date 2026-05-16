import { useEffect, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

export default function ShuttleRefundsPage() {
  const [refunds, setRefunds] = useState<any[]>([]);

  useEffect(() => {
    loadRefunds();
  }, []);

  async function loadRefunds() {
    const res = await fetch("/api/admin/shuttle/refunds");
    const json = await res.json();

    setRefunds(json.refunds || []);
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
                Återbetalningar
              </h1>
            </div>

            <div className="divide-y">
              {refunds.map((refund) => (
                <div key={refund.id} className="p-5">
                  <div className="font-semibold">
                    {refund.shuttle_tickets?.ticket_number}
                  </div>

                  <div className="mt-1 text-sm text-gray-500">
                    {refund.shuttle_tickets?.customer_name}
                  </div>

                  <div className="mt-2 text-sm">
                    {Number(refund.refund_amount || 0).toLocaleString(
                      "sv-SE"
                    )}{" "}
                    kr
                  </div>

                  <div className="mt-1 text-sm text-gray-500">
                    {refund.refund_status}
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
