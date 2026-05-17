import { useEffect, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

function badgeStyle(result?: string) {
  switch (result) {
    case "approved":
      return "bg-green-100 text-green-700";

    case "already_checked_in":
      return "bg-amber-100 text-amber-700";

    case "unpaid":
      return "bg-orange-100 text-orange-700";

    case "cancelled":
      return "bg-red-100 text-red-700";

    default:
      return "bg-red-100 text-red-700";
  }
}

export default function ShuttleScannerHistoryPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    try {
      setLoading(true);

      const res = await fetch(
        "/api/admin/shuttle/scan-logs"
      );

      const json = await res.json();

      setLogs(json.logs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="p-6 pt-24">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[#194C66]">
                Scannerhistorik
              </h1>

              <p className="mt-1 text-sm text-[#194C66]/70">
                Alla scanningar och check-ins för Airport Shuttle.
              </p>
            </div>

            <button
              onClick={loadLogs}
              className="rounded-full border bg-white px-4 py-2 text-sm font-semibold text-[#194C66]"
            >
              Uppdatera
            </button>
          </div>

          <div className="overflow-hidden rounded-3xl bg-white shadow">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] text-left">
                <thead className="bg-[#f8fafc]">
                  <tr className="text-sm text-[#194C66]/80">
                    <th className="px-5 py-4 font-semibold">
                      Tid
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      Resultat
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      Biljett
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      Kund
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      Rutt
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      Avgång
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      Meddelande
                    </th>

                    <th className="px-5 py-4 font-semibold">
                      Scannad av
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-10 text-center text-gray-500"
                      >
                        Laddar historik...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-10 text-center text-gray-500"
                      >
                        Ingen scannerhistorik ännu.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-t"
                      >
                        <td className="px-5 py-4 text-sm">
                          {log.created_at
                            ? new Date(
                                log.created_at
                              ).toLocaleString(
                                "sv-SE"
                              )
                            : "—"}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${badgeStyle(
                              log.scan_result
                            )}`}
                          >
                            {log.scan_result ||
                              "unknown"}
                          </span>
                        </td>

                        <td className="px-5 py-4 font-semibold">
                          {log.ticket_number ||
                            "—"}
                        </td>

                        <td className="px-5 py-4">
                          {log.customer_name ||
                            "—"}
                        </td>

                        <td className="px-5 py-4">
                          {log.route_name ||
                            "—"}
                        </td>

                        <td className="px-5 py-4">
                          {log.departure_date ||
                            "—"}
                          {" · "}
                          {log.departure_time
                            ? String(
                                log.departure_time
                              ).slice(0, 5)
                            : "—"}
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-600">
                          {log.scan_message ||
                            "—"}
                        </td>

                        <td className="px-5 py-4">
                          {log.scanned_by ||
                            "—"}
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
