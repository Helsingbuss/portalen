import Link from "next/link";
import { useEffect, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Row = {
  id: string;
  title: string;
  subtitle?: string | null;
  trip_kind?: string | null;
  country?: string | null;
  year?: number | null;
  price_from?: number | null;
  published: boolean;
  hero_image?: string | null;
  next_date?: string | null;
};

export default function TripsIndexPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const r = await fetch("/api/trips/list");
        const j = await r.json();
        if (!r.ok || j.ok === false) throw new Error(j?.error || "Kunde inte hämta.");
        setRows(j.trips || []);
      } catch (e: any) {
        setErr(e?.message || "Tekniskt fel.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <>
      <AdminMenu />
      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="px-6 pb-16 pt-14 lg:pt-20">
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-xl font-semibold text-[#194C66]">Resor</h1>
            <Link
              href="/admin/trips/new"
              className="px-4 py-2 rounded-[12px] bg-[#194C66] text-white hover:opacity-95"
            >
              + Ny resa
            </Link>
          </div>

          {err && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4">
              {err}
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="text-left font-semibold px-4 py-3">Titel</th>
                    <th className="text-left font-semibold px-4 py-3">Kategori</th>
                    <th className="text-left font-semibold px-4 py-3">Land</th>
                    <th className="text-left font-semibold px-4 py-3">År</th>
                    <th className="text-left font-semibold px-4 py-3">Nästa avgång</th>
                    <th className="text-right font-semibold px-4 py-3">Pris från</th>
                    <th className="text-center font-semibold px-4 py-3">Status</th>
                    <th className="text-right font-semibold px-4 py-3">Åtgärd</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="px-4 py-6 text-slate-500" colSpan={8}>
                        Laddar…
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-slate-500" colSpan={8}>
                        Inga resor ännu.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="px-4 py-3">
                          <div className="font-medium text-[#0f172a]">{r.title}</div>
                          {r.subtitle && (
                            <div className="text-[12px] text-slate-500 truncate max-w-[360px]">
                              {r.subtitle}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{r.trip_kind || "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{r.country || "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{r.year || "-"}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {r.next_date
                            ? new Date(r.next_date).toLocaleDateString("sv-SE", {
                                year: "numeric",
                                month: "short",
                                day: "2-digit",
                              })
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {r.price_from != null ? `fr. ${r.price_from.toLocaleString("sv-SE")} kr` : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={
                              "px-2 py-1 rounded-full text-[12px] " +
                              (r.published
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200")
                            }
                          >
                            {r.published ? "Publicerad" : "Utkast"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/admin/trips/new?id=${r.id}`}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-slate-50"
                            title="Redigera"
                          >
                            {/* Penna (Lucide-lik enkel svg) */}
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <path d="M3 21l3.75-.75L20 7.99 16.01 4 3.75 16.25 3 21z" stroke="currentColor" />
                              <path d="M14 6l4 4" stroke="currentColor" />
                            </svg>
                            <span className="hidden sm:inline">Redigera</span>
                          </Link>
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
