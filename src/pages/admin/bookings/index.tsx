import { useEffect, useMemo, useRef, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";
import Link from "next/link";
import { useRouter } from "next/router";

type BookingRow = {
  id: string;
  booking_number: string | null;
  status: string | null;
  customer_reference: string | null; // mappas från contact_person
  contact_email: string | null; // mappas från customer_email
  created_at: string | null;
  out: { from: string | null; to: string | null; date: string | null; time: string | null } | null;
  ret: { from: string | null; to: string | null; date: string | null; time: string | null } | null;
  passengers?: number | null;
  total_price?: number | string | null;
};

type ListResponse = {
  rows: BookingRow[];
  total: number;
};

const RED_HOURS = 48;
const ORANGE_HOURS = 168;

function clsStatusPill(s?: string | null) {
  const v = (s || "").toLowerCase();
  if (v === "klar" || v === "genomförd" || v === "genomford") return "bg-green-100 text-green-800";
  if (v === "bokad" || v === "planerad" || v === "created" || v === "new") return "bg-blue-100 text-blue-800";
  if (v === "inställd" || v === "installt" || v === "avbokad" || v === "makulerad") return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-700";
}

function tidyTime(t?: string | null) {
  if (!t) return null;
  if (t.includes(":")) return t.slice(0, 5);
  if (t.length >= 4) return `${t.slice(0, 2)}:${t.slice(2, 4)}`;
  return null;
}

function prioForRow(r: BookingRow) {
  const d = r.out?.date || null;
  if (!d) return { label: "—", cls: "bg-gray-200 text-gray-700", title: "Saknar avresedatum" };
  const t = tidyTime(r.out?.time || "00:00") || "00:00";
  const target = new Date(`${d}T${t}`);
  if (isNaN(target.getTime())) return { label: "—", cls: "bg-gray-200 text-gray-700", title: "Ogiltigt datum/tid" };
  const diffH = (target.getTime() - Date.now()) / 36e5;
  if (diffH < RED_HOURS) return { label: "Röd", cls: "bg-red-100 text-red-800", title: "< 48h kvar" };
  if (diffH < ORANGE_HOURS) return { label: "Orange", cls: "bg-amber-100 text-amber-800", title: "48h–7 dygn kvar" };
  return { label: "Grön", cls: "bg-green-100 text-green-800", title: "> 7 dygn kvar" };
}

function toAmount(v: any): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v.replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
const formatKr = (v: any) => new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(toAmount(v));

export default function AdminBookingsIndex() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rows, setRows] = useState<BookingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const abortRef = useRef<AbortController | null>(null);
  const searchDebounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query;
    if (q.page) setPage(Number(q.page) || 1);
    if (q.pageSize) {
      const ps = q.pageSize === "all" ? 9999 : Number(q.pageSize) || 10;
      setPageSize(ps);
    }
    if (typeof q.search === "string") setSearch(q.search);
    if (typeof q.status === "string") setStatus(q.status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  useEffect(() => {
    const qp = new URLSearchParams();
    qp.set("page", String(page));
    qp.set("pageSize", pageSize >= 9999 ? "all" : String(pageSize));
    if (search.trim()) qp.set("search", search.trim());
    if (status) qp.set("status", status);
    router.replace({ pathname: router.pathname, query: Object.fromEntries(qp.entries()) }, undefined, { shallow: true });
  }, [page, pageSize, search, status, router]);

  function normalizeRows(input: BookingRow[]): BookingRow[] {
    return (input || []).map((r) => ({
      ...r,
      out: r.out ? { ...r.out, time: tidyTime(r.out.time) || r.out.time } : null,
      ret: r.ret ? { ...r.ret, time: tidyTime(r.ret.time) || r.ret.time } : null,
    }));
  }

  async function load() {
    setLoading(true);
    setError(null);

    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize || 10));
      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);

      const res = await fetch(`/api/bookings/list?${params.toString()}`, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`Serverfel: ${res.status}`);
      const j: Partial<ListResponse> = await res.json();

      setRows(normalizeRows(j.rows ?? []));
      setTotal(j.total ?? 0);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setError(e?.message || "Något gick fel vid hämtning.");
        setRows([]);
        setTotal(0);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, pageSize]);

  useEffect(() => {
    if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = window.setTimeout(() => {
      setPage(1);
      load();
    }, 300);
    return () => {
      if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const totalPages = useMemo(() => {
    if (!total) return 1;
    const ps = pageSize || 10;
    return Math.max(1, Math.ceil(total / ps));
  }, [total, pageSize]);

  function changePageSize(val: string) {
    if (val === "all") {
      setPageSize(9999);
      setPage(1);
    } else {
      setPageSize(parseInt(val, 10) || 10);
      setPage(1);
    }
  }

  function resetFilters() {
    setSearch("");
    setStatus("");
    setPage(1);
    load();
  }

  const skeletonRows = Array.from({ length: Math.min(pageSize || 10, 10) }).map((_, i) => (
    <tr key={`sk-${i}`} className="border-b animate-pulse" aria-live="polite">
      {Array.from({ length: 12 }).map((__, j) => (
        <td key={j} className="px-3 py-3">
          <div className="h-3 bg-gray-200 rounded w-24" />
        </td>
      ))}
    </tr>
  ));

  return (
    <>
      <AdminMenu />
      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />
        <main className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-[#194C66]">Alla bokningar</h1>
          </div>

          <div className="bg-white rounded-xl shadow p-4 flex flex-col gap-3 md:grid md:grid-cols-4 md:items-end md:gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-[#194C66]/80 mb-1">Sök</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (setPage(1), load())}
                className="w-full border rounded px-3 py-2"
                placeholder="Bokningsnr, beställare, e-post, ort…"
                aria-label="Sök i bokningar"
              />
            </div>
            <div>
              <label className="block text-sm text-[#194C66]/80 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="border rounded px-3 py-2 w-full"
                aria-label="Filtrera på status"
              >
                <option value="">Alla</option>
                <option value="bokad">Bokade</option>
                <option value="klar">Genomförda</option>
                <option value="inställd">Inställda/avbokade</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setPage(1); load(); }} className="px-4 py-2 rounded-[25px] bg-[#194C66] text-white text-sm">
                Sök
              </button>
              <button onClick={resetFilters} className="px-3 py-2 rounded-[25px] border text-sm" aria-label="Återställ filter">
                Återställ
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 p-3 text-sm" role="alert" aria-live="assertive">
              {error}
            </div>
          )}

          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#e5eef3] text-[#194C66]">
                <tr>
                  <th className="text-left px-3 py-2">Bokningsnr</th>
                  <th className="text-left px-3 py-2">Beställare</th>
                  <th className="text-left px-3 py-2">E-post</th>
                  <th className="text-left px-3 py-2">Passagerare</th>
                  <th className="text-left px-3 py-2">Belopp</th>
                  <th className="text-left px-3 py-2">Utresa</th>
                  <th className="text-left px-3 py-2">Avresa</th>
                  <th className="text-left px-3 py-2">Retur</th>
                  <th className="text-left px-3 py-2">Returdatum</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Prio</th>
                  <th className="text-right px-3 py-2">Åtgärd</th>
                </tr>
              </thead>
              <tbody>
                {loading && skeletonRows}

                {!loading &&
                  rows.map((r) => {
                    const pr = prioForRow(r);
                    return (
                      <tr
                        key={r.id}
                        className="border-b cursor-pointer hover:bg-black/[0.02]"
                        onClick={() => router.push(`/admin/bookings/${r.id}`)}
                      >
                        <td className="px-3 py-2">{r.booking_number ?? "—"}</td>
                        <td className="px-3 py-2">{r.customer_reference ?? "—"}</td>
                        <td className="px-3 py-2">{r.contact_email ?? "—"}</td>
                        <td className="px-3 py-2">{r.passengers ?? "—"}</td>
                        <td className="px-3 py-2">{formatKr(r.total_price ?? 0)} kr</td>
                        <td className="px-3 py-2">{r.out ? `${r.out.from ?? "—"} → ${r.out.to ?? "—"}` : "—"}</td>
                        <td className="px-3 py-2">{r.out ? `${r.out.date ?? "—"} ${r.out.time ?? ""}` : "—"}</td>
                        <td className="px-3 py-2">{r.ret ? `${r.ret.from ?? "—"} → ${r.ret.to ?? "—"}` : "—"}</td>
                        <td className="px-3 py-2">{r.ret ? `${r.ret.date ?? "—"} ${r.ret.time ?? ""}` : "—"}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${clsStatusPill(r.status)}`}>{r.status ?? "—"}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span title={pr.title} className={`px-2 py-1 rounded-full text-xs ${pr.cls}`}>
                            {pr.label}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
  <button
    type="button"
    onClick={() => router.push(`/admin/bookings/${r.id}`)}
    className="text-[#194C66] underline"
  >
    Öppna
  </button>
</td>
                      </tr>
                    );
                  })}

                {!loading && rows.length === 0 && (
                  <tr>
                    <td className="px-3 py-6 text-[#194C66]/60" colSpan={12}>
                      Inga bokningar hittades.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[#194C66]/70">Visa:</span>
              <select
                className="border rounded px-2 py-1"
                value={pageSize >= 9999 ? "all" : String(pageSize)}
                onChange={(e) => changePageSize(e.target.value)}
              >
                <option value="10">10</option>
                <option value="15">15</option>
                <option value="20">20</option>
                <option value="all">Alla</option>
              </select>
              <span className="text-[#194C66]/60">poster</span>
            </div>

            <div className="flex items-center justify-between md:justify-end w-full md:w-auto">
              <div className="text-sm text-[#194C66]/70 mr-3">
                Sida {page} av {Math.max(1, totalPages)} (totalt {total})
              </div>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Föregående
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Nästa
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
