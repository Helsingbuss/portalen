import { useEffect, useState } from "react";

import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

export default function ShuttleScannerHistoryPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="p-6 pt-24">
          <div>
            <h1 className="text-2xl font-semibold text-[#194C66]">
              Scannhistorik
            </h1>

            <p className="mt-1 text-sm text-[#194C66]/70">
              Visar alla scannade flygbussbiljetter.
            </p>
          </div>

          <div className="mt-6 overflow-hidden rounded-3xl bg-white shadow">
            {loading ? (
              <div className="p-6 text-sm text-gray-500">
                Laddar historik...
              </div>
            ) : logs.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">
                Ingen historik ännu.
              </div>
            ) : (
              <div className="divide-y">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="font-semibold text-[#0f172a]">
                          {log.scan_code}
                        </div>

                        <div className="mt-1 text-sm text-gray-500">
                          {log.scan_message ||
                            "Ingen information"}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                          {log.scan_result}
                        </div>

                        <div className="mt-2 text-xs text-gray-500">
                          {new Date(
                            log.scanned_at
                          ).toLocaleString("sv-SE")}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
