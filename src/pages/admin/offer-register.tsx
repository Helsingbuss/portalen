import { useEffect, useState } from "react";
import type { NextPage } from "next";
import Header from "@/components/Header";
import AdminMenu from "@/components/AdminMenu";

type OfferRegisterRow = {
  id: number;
  synergybus_id: string | null;
  customer_name: string | null;
  departure: string | null;
  departure_city: string | null;
  destination_city: string | null;
  added_at: string | null;
  expires_at: string | null;
  total_price: number | null;
  commission_percent: number | null;
  trip_type: string | null;
};

type ApiResponse = {
  rows?: OfferRegisterRow[] | null;
  data?: OfferRegisterRow[] | null;
  page?: number;
  perPage?: number;
  totalCount?: number;
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hour = pad(d.getHours());
  const minute = pad(d.getMinutes());
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function formatCurrency(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "-";
  return `${n.toLocaleString("sv-SE")} SEK`;
}

const OfferRegisterPage: NextPage = () => {
  const [rows, setRows] = useState<OfferRegisterRow[]>([]);
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));

  const load = async (p: number) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/offer-register?page=${p}&perPage=${perPage}`
      );

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || "Kunde inte hämta offertregistret.");
      }

      const json = (await res.json()) as ApiResponse;
      const incoming = json.rows ?? json.data ?? [];
      const safeRows = Array.isArray(incoming) ? incoming : [];

      setRows(safeRows);
      setPage(json.page ?? p);
      setTotalCount(
        typeof json.totalCount === "number" ? json.totalCount : safeRows.length
      );
    } catch (e: any) {
      setError(e.message || "Något gick fel vid hämtning av data.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(1);
  }, []);

  const handleDelete = async (row: OfferRegisterRow) => {
    if (
      !window.confirm(
        "Är du säker på att du vill ta bort den här offerten från registret?"
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/offer-register/${row.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || "Kunde inte ta bort posten.");
      }

      await load(page);
    } catch (e: any) {
      alert(e.message || "Något gick fel vid borttagning.");
    }
  };

  const handlePageChange = (p: number) => {
    if (p < 1 || p > totalPages) return;
    void load(p);
  };

  const firstIndex = totalCount === 0 ? 0 : (page - 1) * perPage + 1;
  const lastIndex = Math.min(page * perPage, totalCount);

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[#f5f4f0]">
        <AdminMenu />

        <main className="pl-64 pr-14 pt-16 pb-16">
          <div className="max-w-[1700px] mx-auto">
            <div className="mb-7 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">
                  Offertregister
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  Här samlar du alla offerter från Synergybus med totalpris,
                  provisionssats och utgångsdatum. Tanken är att ersätta
                  Excel-arket.
                </p>
              </div>
              <a
                href="/admin/offer-register-new"
                className="inline-flex items-center rounded-full bg-[#1A545F] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#16434b]"
              >
                + Lägg till ny offert
              </a>
            </div>

            {error && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-2 text-left">ID</th>
                      <th className="px-4 py-2 text-left">Synergybus ID</th>
                      <th className="px-4 py-2 text-left">Kund</th>
                      <th className="px-4 py-2 text-left">Avresa</th>
                      <th className="px-4 py-2 text-left">Från</th>
                      <th className="px-4 py-2 text-left">Till</th>
                      <th className="px-4 py-2 text-left">Tillagd</th>
                      <th className="px-4 py-2 text-left">Går ut</th>
                      <th className="px-4 py-2 text-right">Totalpris</th>
                      <th className="px-4 py-2 text-right">Provision</th>
                      <th className="px-4 py-2 text-left">Typ av resa</th>
                      <th className="px-4 py-2 text-center">Åtgärder</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading && (
                      <tr>
                        <td
                          colSpan={12}
                          className="px-4 py-6 text-center text-sm text-slate-500"
                        >
                          Hämtar data...
                        </td>
                      </tr>
                    )}

                    {!loading && rows.length === 0 && (
                      <tr>
                        <td
                          colSpan={12}
                          className="px-4 py-6 text-center text-sm text-slate-500"
                        >
                          Inga offerter i registret ännu.
                        </td>
                      </tr>
                    )}

                    {!loading &&
                      rows.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-2 text-xs text-slate-500">
                            {row.id}
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-600">
                            {row.synergybus_id ?? "-"}
                          </td>
                          <td className="px-4 py-2">
                            {row.customer_name ?? "-"}
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-600">
                            {row.departure ?? "-"}
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-600">
                            {row.departure_city ?? "-"}
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-600">
                            {row.destination_city ?? "-"}
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-500">
                            {formatDateTime(row.added_at)}
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-500">
                            {formatDateTime(row.expires_at)}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {formatCurrency(row.total_price)}
                          </td>
                          <td className="px-4 py-2 text-right text-xs text-slate-600">
                            {row.commission_percent != null
                              ? `${row.commission_percent
                                  .toString()
                                  .replace(".", ",")} %`
                              : "-"}
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-600">
                            {row.trip_type ?? "-"}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleDelete(row)}
                              className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                            >
                              Ta bort
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                <div>
                  {totalCount > 0 ? (
                    <>
                      Visar{" "}
                      <span className="font-semibold">{firstIndex}</span>
                      <span className="font-semibold">{lastIndex}</span> av{" "}
                      <span className="font-semibold">{totalCount}</span> poster
                    </>
                  ) : (
                    "Inga poster att visa."
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handlePageChange(1)}
                    disabled={page === 1}
                    className="rounded border border-slate-300 bg-white px-2 py-1 disabled:opacity-40"
                  >
                    
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    className="rounded border border-slate-300 bg-white px-2 py-1 disabled:opacity-40"
                  >
                    
                  </button>
                  <span className="px-2">
                    Sida {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages}
                    className="rounded border border-slate-300 bg-white px-2 py-1 disabled:opacity-40"
                  >
                    
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePageChange(totalPages)}
                    disabled={page === totalPages}
                    className="rounded border border-slate-300 bg-white px-2 py-1 disabled:opacity-40"
                  >
                    
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default OfferRegisterPage;
