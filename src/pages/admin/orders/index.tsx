// src/pages/admin/orders/index.tsx
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type Row = {
  id: string;
  order_number: string | null;
  status: string | null;
  driver_name: string | null;
  driver_email: string | null;
  vehicle_reg: string | null;
  out_from: string | null;
  out_to: string | null;
  out_date: string | null;
  out_time: string | null;
  passengers: number | null;
  created_at: string | null;
};

function tidyTime(hhmm?: string | null) {
  if (!hhmm) return "";
  const s = String(hhmm).slice(0, 5);
  const [h = "00", m = "00"] = s.split(":");
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(`${d}T00:00:00`);
  return isNaN(dt.getTime())
    ? d!
    : new Intl.DateTimeFormat("sv-SE", { dateStyle: "medium" }).format(dt);
}

function fmtTime(t?: string | null) {
  const hhmm = tidyTime(t);
  if (!hhmm) return "";
  const dt = new Date(`1970-01-01T${hhmm}:00`);
  return isNaN(dt.getTime())
    ? hhmm
    : new Intl.DateTimeFormat("sv-SE", { timeStyle: "short" }).format(dt);
}

function clsStatusPill(s?: string | null) {
  const v = (s || "").toLowerCase();
  if (v === "draft") return "bg-slate-100 text-slate-800";
  if (v === "sent") return "bg-blue-100 text-blue-800";
  if (v === "ack" || v === "confirmed") return "bg-emerald-100 text-emerald-800";
  if (v === "done") return "bg-green-100 text-green-800";
  if (v.includes("cancel")) return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-700";
}

function labelStatus(s?: string | null) {
  const v = (s || "").toLowerCase();
  if (!v) return "Utkast";
  if (v === "draft") return "Utkast";
  if (v === "sent") return "Skickad";
  if (v === "ack" || v === "confirmed") return "Bekräftad";
  if (v === "done") return "Klar";
  if (v.includes("cancel")) return "Avbokad";
  return s || "—";
}

export default function OrdersList() {
  const router = useRouter();

  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const listAbortRef = useRef<AbortController | null>(null);
  const searchDebounceRef = useRef<number | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    if (listAbortRef.current) listAbortRef.current.abort();
    const ctrl = new AbortController();
    listAbortRef.current = ctrl;

    try {
      const qs = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        status,
        search,
      });

      const r = await fetch(`/api/orders/list?${qs}`, {
        signal: ctrl.signal,
      });

      if (!r.ok) throw new Error(`HTTP ${r.status}`);

      const j = await r.json();
      setRows(j?.rows ?? []);
      setTotal(j?.total ?? 0);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setError("Kunde inte hämta körordrar.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [status, page, pageSize]);

  useEffect(() => {
    if (searchDebounceRef.current)
      window.clearTimeout(searchDebounceRef.current);

    searchDebounceRef.current = window.setTimeout(() => {
      setPage(1);
      load();
    }, 300);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <AdminMenu />
      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="p-6 pt-16 space-y-6">

          {/* HEADER */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-semibold text-[#194C66]">
                Körordrar
              </h1>
              <p className="text-xs text-[#194C66]/60">
                Hantera alla körningar och chaufförer
              </p>
            </div>

            <a
              href="/admin/orders/new"
              className="px-5 py-2 rounded-full bg-[#194C66] text-white text-sm shadow hover:bg-[#16394d]"
            >
              + Ny körorder
            </a>
          </div>

          {/* FILTER */}
          <div className="bg-white rounded-2xl shadow border p-4 flex flex-wrap gap-3">

            <input
              className="border rounded-full px-4 py-2 text-sm w-[220px]"
              placeholder="Sök..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className="border rounded-full px-4 py-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Alla status</option>
              <option value="draft">Utkast</option>
              <option value="sent">Skickad</option>
              <option value="ack">Bekräftad</option>
              <option value="done">Klar</option>
            </select>

            <select
              className="border rounded-full px-4 py-2 text-sm"
              value={pageSize}
              onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={1000}>Alla</option>
            </select>
          </div>

          {/* ERROR */}
          {error && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* TABLE */}
          <div className="bg-white rounded-2xl shadow border overflow-hidden">
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#f1f5f9] text-[#194C66] text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Körorder</th>
                    <th className="px-4 py-3 text-left">Sträcka</th>
                    <th className="px-4 py-3 text-left">Chaufför</th>
                    <th className="px-4 py-3 text-left">Fordon</th>
                    <th className="px-4 py-3 text-left">PAX</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-gray-400">
                        Laddar...
                      </td>
                    </tr>
                  )}

                  {!loading && rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-gray-400">
                        Inga körordrar
                      </td>
                    </tr>
                  )}

                  {rows.map((r) => (
                    <tr key={r.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold">
                          {r.order_number ?? "—"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {fmtDate(r.out_date)} {fmtTime(r.out_time)}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {r.out_from} → {r.out_to}
                      </td>

                      <td className="px-4 py-3">
                        <div>{r.driver_name}</div>
                        <div className="text-xs text-gray-400">
                          {r.driver_email}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {r.vehicle_reg}
                      </td>

                      <td className="px-4 py-3 font-medium">
                        {r.passengers}
                      </td>

                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs ${clsStatusPill(r.status)}`}>
                          {labelStatus(r.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            {total > pageSize && (
              <div className="p-4 flex justify-between items-center border-t text-sm">
                <span className="text-[#194C66]/60">
                  Sida {page} av {totalPages}
                </span>

                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1 border rounded-full"
                  >
                    ←
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1 border rounded-full"
                  >
                    →
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
