// src/components/trips/DeparturesTable.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

type DepartureStatus = "available" | "full" | "waitlist";

type DepartureRow = {
  id: string;
  trip_id: string;
  trip_title: string;
  date: string | null;      // YYYY-MM-DD
  weekday: string;          // "tor", "fre" ...
  dep_time: string | null;  // "06:30"
  line_name: string | null;
  price_from: number | null;
  seats_left: number | null;
  status: DepartureStatus;
};

type ApiResponse = {
  ok: boolean;
  error?: string;
  trip?: {
    id: string;
    title: string;
    price_from: number | null;
    slug: string | null;
  };
  departures?: DepartureRow[];
};

export function DeparturesTable({ slug }: { slug: string }) {
  const router = useRouter();
  const [rows, setRows] = useState<DepartureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const r = await fetch(
          `/api/public/trips/departures?slug=${encodeURIComponent(slug)}`
        );
        const j: ApiResponse = await r.json();
        if (!r.ok || !j.ok) {
          throw new Error(j.error || "Kunde inte hämta avgångar.");
        }
        setRows(j.departures || []);
      } catch (e: any) {
        setErr(e?.message || "Tekniskt fel.");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  function formatDate(row: DepartureRow) {
    if (!row.date) return "–";
    // 2026-06-25 Tor 06:30
    const day = row.date;
    const wd = row.weekday ? row.weekday.charAt(0).toUpperCase() + row.weekday.slice(1) : "";
    const time = row.dep_time ? row.dep_time.slice(0, 5) : "";
    return [day, wd, time].filter(Boolean).join(" ");
  }

  function formatPrice(price: number | null) {
    if (price == null) return "–";
    return (
      new Intl.NumberFormat("sv-SE", {
        style: "currency",
        currency: "SEK",
        maximumFractionDigits: 0,
      }).format(price) // "295 kr"
    );
  }

  function seatsLabel(row: DepartureRow) {
    if (row.status === "full") return "Fullsatt";

    const n = row.seats_left;
    if (n == null) return ">8";

    if (n <= 0) return "Fullsatt";
    if (n <= 3) return "Få platser";
    if (n > 8) return ">8";

    return String(n);
  }

  function handleBook(row: DepartureRow) {
    if (row.status === "full") return;
    // Här bestämmer vi hur kassan ska ta emot info
    // Just nu: skicka departure_id som query-param
    router.push(`/kassa?departure_id=${encodeURIComponent(row.id)}`);
  }

  return (
    <div className="mt-6">
      <h2 className="mb-3 text-lg font-semibold text-[#0f172a]">
        Kommande avgångar
      </h2>

      {err && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
          Laddar avgångar…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
          Inga kommande avgångar är upplagda för denna resa.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                    Avresa
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                    Resmål
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                    Pris från
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">
                    Platser kvar
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                    &nbsp;
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-slate-100 bg-white hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="px-4 py-3 align-middle text-slate-900">
                      {formatDate(row)}
                    </td>
                    <td className="px-4 py-3 align-middle text-slate-800">
                      {row.trip_title}
                    </td>
                    <td className="px-4 py-3 align-middle text-right text-slate-900">
                      {row.price_from != null ? (
                        <span className="font-medium">
                          {formatPrice(row.price_from)}
                        </span>
                      ) : (
                        <span className="text-slate-400">–</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle text-center">
                      <span className="inline-flex min-w-[72px] justify-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-800">
                        {seatsLabel(row)}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle text-right">
                      {row.status === "full" ? (
                        <button
                          type="button"
                          disabled
                          className="inline-flex items-center justify-center rounded-full bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 cursor-not-allowed"
                        >
                          Fullsatt
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleBook(row)}
                          className="inline-flex items-center justify-center rounded-full bg-[#194C66] px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#163b4d] hover:shadow-md transition"
                        >
                          Boka
                          <span className="ml-2 text-sm">→</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeparturesTable;
