import { useEffect, useMemo, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";
import Link from "next/link";

type BookingRow = {
  id: string;
  booking_number: string | null;
  status: string | null;
  customer_reference: string | null;
  contact_email: string | null;
  created_at: string | null;
  out: { from: string | null; to: string | null; date: string | null; time: string | null } | null;
  ret: { from: string | null; to: string | null; date: string | null; time: string | null } | null;
  passengers?: number | null; // <-- NYTT (om API skickar, annars "â€”")
};

const RED_HOURS = 48;
const ORANGE_HOURS = 168;

function clsStatusPill(s?: string | null) {
  const v = (s || "").toLowerCase();
  if (v === "klar" || v === "genomfÃ¶rd" || v === "genomford") return "bg-green-100 text-green-800";
  if (v === "bokad") return "bg-blue-100 text-blue-800";
  if (v === "instÃ¤lld" || v === "installt" || v === "avbokad") return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-700";
}

function prioForRow(r: BookingRow) {
  const d = r.out?.date || null;
  if (!d) return { label: "â€”", cls: "bg-gray-200 text-gray-700", title: "Saknar avresedatum" };
  const t = r.out?.time || "00:00";
  const target = new Date(`${d}T${t.length === 5 ? t : "00:00"}`);
  const diffH = (target.getTime() - Date.now()) / 36e5;
  if (diffH < RED_HOURS) return { label: "RÃ¶d", cls: "bg-red-100 text-red-800", title: "< 48h kvar" };
  if (diffH < ORANGE_HOURS) return { label: "Orange", cls: "bg-amber-100 text-amber-800", title: "48hâ€“7 dygn kvar" };
  return { label: "GrÃ¶n", cls: "bg-green-100 text-green-800", title: "> 7 dygn kvar" };
}

export default function AdminBookingsIndex() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize || 10));
      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      const res = await fetch(`/api/bookings/list?${params.toString()}`);
      const j = await res.json();
      setRows(j.rows ?? []);
      setTotal(j.total ?? 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, pageSize]);

  const totalPages = useMemo(() => {
    if (!total) return 1;
    const ps = pageSize || 10;
    return Math.max(1, Math.ceil(total / ps));
  }, [total, pageSize]);

  function changePageSize(val: string) {
    if (val === "all") { setPageSize(9999); setPage(1); }
    else { setPageSize(parseInt(val, 10) || 10); setPage(1); }
  }

  return (
    <>
      <AdminMenu />
      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />
        <main className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-[#194C66]">Alla bokningar</h1>
          </div>

          {/* Filter */}
          <div className="bg-white rounded-xl shadow p-4 flex flex-col gap-3 md:grid md:grid-cols-4 md:items-end md:gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-[#194C66]/80 mb-1">SÃ¶k</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (setPage(1), load())}
                className="w-full border rounded px-3 py-2"
                placeholder="Bokningsnr, kund, e-post, ortâ€¦"
              />
            </div>
            <div>
              <label className="block text-sm text-[#194C66]/80 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                className="border rounded px-3 py-2 w-full"
              >
                <option value="">Alla</option>
                <option value="bokad">Bokade</option>
                <option value="klar">GenomfÃ¶rda</option>
                <option value="instÃ¤lld">InstÃ¤llda/avbokade</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setPage(1); load(); }} className="px-4 py-2 rounded-[25px] bg-[#194C66] text-white text-sm">
                SÃ¶k
              </button>
            </div>
          </div>

          {/* Prio-legend */}
          <div className="text-xs text-[#194C66]/70">
            <span className="inline-flex items-center gap-1 mr-3">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" /> GrÃ¶n = &gt; 7 dygn
            </span>
            <span className="inline-flex items-center gap-1 mr-3">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" /> Orange = 48hâ€“7 dygn
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" /> RÃ¶d = &lt; 48h
            </span>
          </div>

          {/* Tabell */}
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#e5eef3] text-[#194C66]">
                <tr>
                  <th className="text-left px-3 py-2">Bokningsnr</th>
                  <th className="text-left px-3 py-2">Kund</th>
                  <th className="text-left px-3 py-2">E-post</th>
                  <th className="text-left px-3 py-2">Passagerare</th>{/* NYTT */}
                  <th className="text-left px-3 py-2">Utresa</th>
                  <th className="text-left px-3 py-2">Avresa</th>
                  <th className="text-left px-3 py-2">Retur</th>
                  <th className="text-left px-3 py-2">Returdatum</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Prio</th>
                  <th className="text-right px-3 py-2">Ã…tgÃ¤rd</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const pr = prioForRow(r);
                  return (
                    <tr key={r.id} className="border-b">
                      <td className="px-3 py-2">{r.booking_number ?? "â€”"}</td>
                      <td className="px-3 py-2">{r.customer_reference ?? "â€”"}</td>
                      <td className="px-3 py-2">{r.contact_email ?? "â€”"}</td>
                      <td className="px-3 py-2">{r.passengers ?? "â€”"}</td> {/* NYTT */}
                      <td className="px-3 py-2">
                        {r.out ? `${r.out.from ?? "â€”"} â†’ ${r.out.to ?? "â€”"}` : "â€”"}
                      </td>
                      <td className="px-3 py-2">
                        {r.out ? `${r.out.date ?? "â€”"} ${r.out.time ?? ""}` : "â€”"}
                      </td>
                      <td className="px-3 py-2">
                        {r.ret ? `${r.ret.from ?? "â€”"} â†’ ${r.ret.to ?? "â€”"}` : "â€”"}
                      </td>
                      <td className="px-3 py-2">
                        {r.ret ? `${r.ret.date ?? "â€”"} ${r.ret.time ?? ""}` : "â€”"}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${clsStatusPill(r.status)}`}>
                          {r.status ?? "â€”"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span title={pr.title} className={`px-2 py-1 rounded-full text-xs ${pr.cls}`}>
                          {pr.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Link className="text-[#194C66] underline" href={`/admin/bookings/${r.id}`}>
                          Ã–ppna
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td className="px-3 py-6 text-[#194C66]/60" colSpan={11}>
                      Inga bokningar hittades.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer: Visa-vÃ¤ljare + Pagination */}
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
                  FÃ¶regÃ¥ende
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  NÃ¤sta
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

