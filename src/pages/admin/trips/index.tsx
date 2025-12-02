// src/pages/admin/trips/index.tsx
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
        if (!r.ok || j.ok === false)
          throw new Error(j?.error || "Kunde inte hämta.");
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
          {/* Topprad */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-[#194C66]">Resor</h1>
              <p className="text-sm text-slate-600">
                Hantera alla paketresor, shoppingturer och kryssningar i
                Helsingbuss-portalen.
              </p>
            </div>
            <Link
              href="/admin/trips/new"
              className="inline-flex items-center justify-center rounded-[12px] bg-[#194C66] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#163b4d] hover:shadow-md transition"
            >
              <span className="mr-1 text-lg leading-none">＋</span>
              Ny resa
            </Link>
          </div>

          {err && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                      Titel
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                      Kategori
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                      Land
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                      År
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                      Nästa avgång
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                      Pris från
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                      Åtgärd
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        className="px-4 py-8 text-center text-slate-500"
                        colSpan={8}
                      >
                        Laddar resor…
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td
                        className="px-4 py-8 text-center text-slate-500"
                        colSpan={8}
                      >
                        Inga resor ännu. Klicka på{" "}
                        <span className="font-medium">Ny resa</span> för att
                        lägga till den första.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr
                        key={r.id}
                        className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors"
                      >
                        {/* Titel + bild */}
                        <td className="px-4 py-3 align-top">
                          <div className="flex items-start gap-3">
                            {r.hero_image && (
                              <div className="hidden h-10 w-16 overflow-hidden rounded-md bg-slate-100 sm:block">
                                <img
                                  src={r.hero_image}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-[#0f172a]">
                                {r.title}
                              </div>
                              {r.subtitle && (
                                <div className="max-w-[360px] truncate text-[12px] text-slate-500">
                                  {r.subtitle}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Kategori */}
                        <td className="px-4 py-3 align-top text-slate-700">
                          {r.trip_kind ? (
                            <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                              {r.trip_kind}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* Land */}
                        <td className="px-4 py-3 align-top text-slate-700">
                          {r.country || (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* År */}
                        <td className="px-4 py-3 align-top text-slate-700">
                          {r.year ?? <span className="text-slate-400">-</span>}
                        </td>

                        {/* Nästa avgång */}
                        <td className="px-4 py-3 align-top text-slate-700">
                          {r.next_date ? (
                            <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-100">
                              {new Date(
                                r.next_date
                              ).toLocaleDateString("sv-SE", {
                                year: "numeric",
                                month: "short",
                                day: "2-digit",
                              })}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Pris */}
                        <td className="px-4 py-3 align-top text-right">
                          {r.price_from != null ? (
                            <span className="font-medium text-slate-900">
                              fr. {r.price_from.toLocaleString("sv-SE")} kr
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 align-top text-center">
                          <span
                            className={
                              "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-medium " +
                              (r.published
                                ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border border-slate-200 bg-slate-100 text-slate-600")
                            }
                          >
                            {r.published ? "Publicerad" : "Utkast"}
                          </span>
                        </td>

                        {/* Åtgärd */}
                        <td className="px-4 py-3 align-top text-right">
                          <Link
                            href={{
                              pathname: "/admin/trips/new",
                              query: { id: r.id }, // 👈 detta är rätt – skickar trip-id
                            }}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                            title="Redigera"
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              aria-hidden="true"
                            >
                              <path
                                d="M3 17.25V21h3.75L17.81 9.94 14.06 6.19 3 17.25z"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M18.37 3.63a1.75 1.75 0 0 1 2.47 2.47L18.5 8.44 15.56 5.5l2.81-1.87z"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
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
