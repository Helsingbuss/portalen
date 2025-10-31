import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import AdminMenu from "@/components/AdminMenu";

type DocStatus = { tag: string; days: number };
type DriverRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  license_classes: string[];
  active: boolean;
  updated_at: string | null;
  docStatus: DocStatus;
};

type ApiResponse = {
  rows: DriverRow[];
  page: number;
  pageSize: number;
  total: number;
};

function clsBadge(list: string[]) {
  if (!list?.length) return "—";
  return list.join(", ");
}

function tagClass(tag: string) {
  // små badges i samma stil/ton som övriga admin
  switch (tag) {
    case "ok":
      return "bg-green-50 text-green-700 border border-green-200";
    case "snart (≤30d)":
      return "bg-yellow-50 text-yellow-700 border border-yellow-200";
    case "snart (≤60d)":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    case "snart (≤90d)":
      return "bg-orange-50 text-orange-700 border border-orange-200";
    case "utgånget":
      return "bg-red-50 text-red-700 border border-red-200";
    case "saknas":
    default:
      return "bg-gray-50 text-gray-700 border border-gray-200";
  }
}

export default function AdminDriversListPage() {
  // Filter-state
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | "aktiv" | "inaktiv">("");
  const [cls, setCls] = useState("");
  const [expSoon, setExpSoon] = useState<0 | 30 | 60 | 90>(0);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // Data-state
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<DriverRow[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Bygg URL: håll den stabil för useEffect
  const queryUrl = useMemo(() => {
    const u = new URL("/api/drivers/list", window.location.origin);
    if (search.trim()) u.searchParams.set("search", search.trim());
    if (status) u.searchParams.set("status", status);
    if (cls.trim()) u.searchParams.set("cls", cls.trim().toUpperCase());
    if (expSoon) u.searchParams.set("expSoon", String(expSoon));
    u.searchParams.set("page", String(page));
    u.searchParams.set("pageSize", String(pageSize));
    return u.toString();
  }, [search, status, cls, expSoon, page, pageSize]);

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(queryUrl);
        if (!res.ok) throw new Error(`Kunde inte hämta chaufförer (${res.status})`);
        const j: ApiResponse = await res.json();
        if (abort) return;
        setRows(j.rows || []);
        setTotal(j.total || 0);
      } catch (e: any) {
        if (!abort) {
          setError(e?.message || "Kunde inte hämta chaufförer");
          setRows([]);
          setTotal(0);
        }
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => {
      abort = true;
    };
  }, [queryUrl]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Reset page till 1 när filter ändras (utom page själv)
  useEffect(() => {
    setPage(1);
  }, [search, status, cls, expSoon]);

  return (
    <>
      <AdminMenu />
      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />
        <main className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-[#194C66]">Chaufförer</h1>
          </div>

          {/* Filterkort */}
          <div className="bg-white rounded-xl shadow p-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm text-[#194C66]/80 mb-1">Sök</label>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Namn, e-post, telefon"
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm text-[#194C66]/80 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full border rounded px-3 py-2 bg-white"
                >
                  <option value="">Alla</option>
                  <option value="aktiv">Aktiv</option>
                  <option value="inaktiv">Inaktiv</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-[#194C66]/80 mb-1">Körkortsklass</label>
                <input
                  value={cls}
                  onChange={(e) => setCls(e.target.value)}
                  placeholder="t.ex. D, DE, C, CE"
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm text-[#194C66]/80 mb-1">Dokument går ut</label>
                <select
                  value={String(expSoon)}
                  onChange={(e) => setExpSoon(Number(e.target.value) as 0 | 30 | 60 | 90)}
                  className="w-full border rounded px-3 py-2 bg-white"
                >
                  <option value="0">Alla</option>
                  <option value="30">≤ 30 dagar</option>
                  <option value="60">≤ 60 dagar</option>
                  <option value="90">≤ 90 dagar</option>
                </select>
              </div>

              <div className="flex items-end gap-2">
                <button
                  onClick={() => {
                    setSearch("");
                    setStatus("");
                    setCls("");
                    setExpSoon(0);
                  }}
                  className="px-4 py-2 rounded-[25px] border text-sm text-[#194C66]"
                >
                  Rensa filter
                </button>
              </div>
            </div>
          </div>

          {/* Lista */}
          <div className="bg-white rounded-xl shadow p-4">
            {loading && <div className="text-[#194C66]/70">Laddar…</div>}
            {!loading && error && (
              <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 p-3 text-sm">
                {error}
              </div>
            )}

            {!loading && !error && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#e5eef3] text-[#194C66]">
                      <tr>
                        <th className="text-left px-3 py-2">Namn</th>
                        <th className="text-left px-3 py-2">Telefon</th>
                        <th className="text-left px-3 py-2">E-post</th>
                        <th className="text-left px-3 py-2">Körkort</th>
                        <th className="text-left px-3 py-2">Status</th>
                        <th className="text-left px-3 py-2">Dokument</th>
                        <th className="text-left px-3 py-2">Uppdaterad</th>
                        <th className="text-right px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 && (
                        <tr>
                          <td className="px-3 py-4 text-[#194C66]/60" colSpan={8}>
                            Inga träffar.
                          </td>
                        </tr>
                      )}
                      {rows.map((r) => (
                        <tr key={r.id} className="border-b">
                          <td className="px-3 py-2">{r.name}</td>
                          <td className="px-3 py-2">{r.phone}</td>
                          <td className="px-3 py-2">{r.email}</td>
                          <td className="px-3 py-2">{clsBadge(r.license_classes)}</td>
                          <td className="px-3 py-2">
                            <span
                              className={
                                "inline-block px-2 py-1 rounded-full text-xs " +
                                (r.active
                                  ? "bg-green-50 text-green-700 border border-green-200"
                                  : "bg-gray-50 text-gray-700 border border-gray-200")
                              }
                            >
                              {r.active ? "Aktiv" : "Inaktiv"}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`inline-block px-2 py-1 rounded-full text-xs ${tagClass(r.docStatus.tag)}`}>
                              {r.docStatus.tag}
                              {Number.isFinite(r.docStatus.days) ? ` (${r.docStatus.days} d)` : ""}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {r.updated_at ? new Date(r.updated_at).toLocaleDateString() : "—"}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <a
                              href={`/admin/drivers/${r.id}`}
                              className="text-[#194C66] underline"
                            >
                              Öppna
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-[#194C66]/70">
                    Sida {page} av {totalPages} ({total} st)
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="px-3 py-2 rounded-[25px] border text-sm text-[#194C66] disabled:opacity-50"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Föregående
                    </button>
                    <button
                      className="px-3 py-2 rounded-[25px] border text-sm text-[#194C66] disabled:opacity-50"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Nästa
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

// Tvinga SSR (förhindrar att Vercel försöker SSG:a sidan under build)
export async function getServerSideProps() {
  return { props: {} };
}
