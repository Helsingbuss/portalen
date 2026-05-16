import { useEffect, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

export default function ShuttleTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);

  useEffect(() => {
    loadTickets();
  }, []);

  async function loadTickets() {
    const res = await fetch("/api/admin/shuttle/tickets");
    const json = await res.json();

    setTickets(json.tickets || []);
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
                Biljetter
              </h1>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] text-left">
                <thead className="bg-[#f8fafc] text-sm text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Biljett</th>
                    <th className="px-4 py-3">Kund</th>
                    <th className="px-4 py-3">Telefon</th>
                    <th className="px-4 py-3">Belopp</th>
                    <th className="px-4 py-3">Betalstatus</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Check-in</th>
                  </tr>
                </thead>

                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="border-b">
                      <td className="px-4 py-3 font-semibold">
                        {ticket.ticket_number}
                      </td>

                      <td className="px-4 py-3">
                        {ticket.customer_name}
                      </td>

                      <td className="px-4 py-3">
                        {ticket.customer_phone || "—"}
                      </td>

                      <td className="px-4 py-3">
                        {Number(ticket.total_amount || 0).toLocaleString(
                          "sv-SE"
                        )}{" "}
                        kr
                      </td>

                      <td className="px-4 py-3">
                        {ticket.payment_status}
                      </td>

                      <td className="px-4 py-3">
                        {ticket.ticket_status}
                      </td>

                      <td className="px-4 py-3">
                        {ticket.checked_in ? "Ja" : "Nej"}
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
