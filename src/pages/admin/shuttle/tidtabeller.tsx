import { useEffect, useMemo, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

function tidyTime(value?: string | null) {
  if (!value) return "—";
  return String(value).slice(0, 5);
}

function money(value?: number | null) {
  return Number(value || 0).toLocaleString("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  });
}

export default function ShuttleTimetablesPage() {
  const [lines, setLines] = useState<any[]>([]);
  const [selectedLineId, setSelectedLineId] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadLines() {
    try {
      setLoading(true);

      const res = await fetch("/api/admin/shuttle/lines");
      const json = await res.json().catch(() => ({}));

      setLines(json.lines || []);

      if (!selectedLineId && json.lines?.length) {
        setSelectedLineId(json.lines[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedLine = useMemo(() => {
    return lines.find((line) => line.id === selectedLineId) || null;
  }, [lines, selectedLineId]);

  const stops = selectedLine?.shuttle_line_stops || [];

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="space-y-6 p-6 pt-24">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[#194C66]">
                Airport Shuttle – Tidtabeller
              </h1>
              <p className="mt-1 text-sm text-[#194C66]/70">
                Se hållplatser, tider och priser per linje.
              </p>
            </div>

            <button
              onClick={loadLines}
              className="rounded-full border bg-white px-4 py-2 text-sm font-semibold text-[#194C66]"
            >
              Uppdatera
            </button>
          </div>

          <section className="rounded-3xl bg-white p-6 shadow">
            <label className="block">
              <div className="mb-1 text-sm font-medium text-[#194C66]">
                Välj linje
              </div>

              <select
                value={selectedLineId}
                onChange={(e) => setSelectedLineId(e.target.value)}
                className="w-full max-w-xl rounded-xl border px-3 py-2"
              >
                {lines.map((line) => (
                  <option key={line.id} value={line.id}>
                    {line.name}
                    {line.code ? ` (${line.code})` : ""}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className="overflow-hidden rounded-3xl bg-white shadow">
            <div className="border-b p-5">
              <h2 className="text-lg font-semibold text-[#194C66]">
                {selectedLine?.name || "Tidtabell"}
              </h2>

              {selectedLine?.shuttle_routes?.name && (
                <p className="mt-1 text-sm text-gray-500">
                  Rutt: {selectedLine.shuttle_routes.name}
                </p>
              )}
            </div>

            {loading ? (
              <div className="p-6 text-sm text-gray-500">
                Laddar tidtabell...
              </div>
            ) : !selectedLine ? (
              <div className="p-6 text-sm text-gray-500">
                Ingen linje vald.
              </div>
            ) : stops.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">
                Inga hållplatser kopplade till denna linje ännu.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] text-left text-sm">
                  <thead className="bg-[#f8fafc] text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-5 py-3">Ordning</th>
                      <th className="px-5 py-3">Hållplats</th>
                      <th className="px-5 py-3">Ort</th>
                      <th className="px-5 py-3">Avgång</th>
                      <th className="px-5 py-3">Ankomst</th>
                      <th className="px-5 py-3">Pris</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {stops.map((lineStop: any) => (
                      <tr key={lineStop.id} className="hover:bg-[#f8fafc]">
                        <td className="px-5 py-4 font-semibold text-[#194C66]">
                          {lineStop.stop_order || 0}
                        </td>

                        <td className="px-5 py-4 font-medium text-[#0f172a]">
                          {lineStop.shuttle_stops?.name || "—"}
                        </td>

                        <td className="px-5 py-4 text-gray-600">
                          {lineStop.shuttle_stops?.city || "—"}
                        </td>

                        <td className="px-5 py-4">
                          {tidyTime(lineStop.departure_time)}
                        </td>

                        <td className="px-5 py-4">
                          {tidyTime(lineStop.arrival_time)}
                        </td>

                        <td className="px-5 py-4 font-semibold text-[#194C66]">
                          {money(lineStop.price)}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              lineStop.is_active !== false
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {lineStop.is_active !== false ? "Aktiv" : "Inaktiv"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>
    </>
  );
}
