import { useEffect, useMemo, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";
import Link from "next/link";

type Row = {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  active: boolean;
  updated_at: string | null;
};

export default function EmployeesListPage() {
  // filter
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | "aktiv" | "inaktiv">("");
  const [role, setRole] = useState("");

  // paging
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // data
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  function buildUrl() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("active", status);
    if (role) params.set("role", role);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    return `/api/employees/list?${params.toString()}`;
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(buildUrl());
      const j = await res.json();
      setRows(j?.rows ?? []);
      setTotal(j?.total ?? 0);
    } catch {
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, role, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const fmtDate = (iso?: string | null) => (iso ? iso.slice(0, 10) : "—");

  return (
    <>
      <AdminMenu />
      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="p-6 space-y-6">
          <div className="mt-4" />

          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-[#194C66]">Anställda</h1>
            <Link
              href="/admin/employees/new"
              className="px-4 py-2 rounded-[25px] bg-[#194C66] text-white text-sm"
            >
              + Lägg till anställd
            </Link>
          </div>

          {/* Filterrad */}
          <div className="bg-white rounded-xl shadow p-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <label className="text-sm text-[#194C66]/80">
                <span className="block mb-1">Sök (namn/e-post/telefon)</span>
                <input
                  value={search}
                  onChange={(e) => { setPage(1); setSearch(e.target.value); }}
                  className="w-full border rounded px-2 py-1"
                  placeholder="Skriv för att söka…"
                />
              </label>

              <label className="text-sm text-[#194C66]/80">
                <span className="block mb-1">Status</span>
                <select
                  value={status}
                  onChange={(e) => { setPage(1); setStatus(e.target.value as any); }}
                  className="w-full border rounded px-2 py-1"
                >
                  <option value="">Alla</option>
                  <option value="aktiv">Aktiv</option>
                  <option value="inaktiv">Inaktiv</option>
                </select>
              </label>

              <label className="text-sm text-[#194C66]/80">
                <span className="block mb-1">Roll</span>
                <input
                  value={role}
                  onChange={(e) => { setPage(1); setRole(e.target.value); }}
                  className="w-full border rounded px-2 py-1"
                  placeholder="t.ex. Chaufför"
                />
              </label>

              <div />

              <label className="text-sm text-[#194C66]/80">
                <span className="block mb-1">Rader per sida</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPage(1); setPageSize(Number(e.target.value)); }}
                  className="w-full border rounded px-2 py-1"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </label>
            </div>
          </div>

          {/* Tabell */}
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="min-w-full table-fixed border-separate border-spacing-0">
              <colgroup>
                <col className="w-[240px]" />
                <col className="w-[160px]" />
                <col className="w-[240px]" />
                <col className="w-[160px]" />
                <col className="w-[120px]" />
              </colgroup>
              <thead>
                <tr className="text-left text-sm text-[#194C66]/70 select-none">
                  <th className="px-4 py-2 font-bold">Namn</th>
                  <th className="px-4 py-2 font-bold">Telefon</th>
                  <th className="px-4 py-2 font-bold">E-post</th>
                  <th className="px-4 py-2 font-bold">Roll</th>
                  <th className="px-4 py-2 font-bold">Uppdaterad</th>
                </tr>
              </thead>
              <tbody className="text-[15px] text-[#194C66]">
                {loading && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-[#194C66]/60">Laddar…</td></tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-[#194C66]/60">Inga anställda hittades.</td></tr>
                )}

                {!loading && rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-b-0 border-[#E5E7EB]/80 hover:bg-[#194C66]/5">
                    <td className="px-4 py-3">{r.name || "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{r.phone || "—"}</td>
                    <td className="px-4 py-3">{r.email || "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{r.role || "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{fmtDate(r.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginering */}
          <div className="flex items-center justify-between text-sm text-[#194C66]/80">
            <div>
              Visar{" "}
              <strong className="text-[#194C66]">
                {rows.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}
              </strong>{" "}
              av <strong className="text-[#194C66]">{total}</strong>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1 rounded border border-[#E5E7EB] disabled:opacity-40"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Föregående
              </button>
              <span>
                Sida <strong className="text-[#194C66]">{page}</strong> av{" "}
                <strong className="text-[#194C66]">{totalPages}</strong>
              </span>
              <button
                className="px-3 py-1 rounded border border-[#E5E7EB] disabled:opacity-40"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Nästa
              </button>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
