// src/pages/admin/drivers/index.tsx
import { useEffect, useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";
import DriverStatusPill, { toDocTag } from "@/components/drivers/DriverStatusPill";
import Link from "next/link";

type APIRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  license_classes: string[] | null;
  active: boolean | null;
  updated_at: string | null;
  docs_expire_at?: string | null;
};

type Row = {
  id: string;
  name: string;
  phone: string;
  email: string;
  license_classes: string[];
  active: boolean;
  updated_at: string | null;
  docStatus: {
    tag: "ok" | "snart (â‰¤30d)" | "snart (â‰¤60d)" | "snart (â‰¤90d)" | "utgånget" | "saknas";
    days: number;
  };
};

function computeDocStatus(expiresIso?: string | null): Row["docStatus"] {
  if (!expiresIso) return { tag: "saknas", days: 0 };
  const today = new Date();
  const exp = new Date(expiresIso);
  // rÃ¤kna hela dagar (utan tid)
  const oneDay = 1000 * 60 * 60 * 24;
  const days = Math.floor((exp.getTime() - today.setHours(0, 0, 0, 0)) / oneDay);

  if (days < 0) return { tag: "utgånget", days };
  if (days <= 30) return { tag: "snart (â‰¤30d)", days };
  if (days <= 60) return { tag: "snart (â‰¤60d)", days };
  if (days <= 90) return { tag: "snart (â‰¤90d)", days };
  return { tag: "ok", days };
}

export default function DriversListPage() {
  // Filter & sÃ¶k
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | "aktiv" | "inaktiv">("");
  const [cls, setCls] = useState(""); // "D", "DE", ...
  const [expSoon, setExpSoon] = useState<0 | 30 | 60 | 90>(0);

  // Paging
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Data
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  function buildUrl() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);          // "alla" hanteras i API
    if (cls) params.set("klass", cls);                 // API-param: klass
    if (expSoon) params.set("expireInDays", String(expSoon)); // API-param: expireInDays
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    return `/api/drivers/list?${params.toString()}`;
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(buildUrl());
      const j: { rows: APIRow[]; total: number } = await res.json();

      const mapped: Row[] = (j?.rows ?? []).map((d) => ({
        id: d.id,
        name: `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim() || "(Namn saknas)",
        phone: d.phone ?? "â€”",
        email: d.email ?? "â€”",
        license_classes: d.license_classes ?? [],
        active: d.active !== false, // defaulta till true om null
        updated_at: d.updated_at ?? null,
        docStatus: computeDocStatus(d.docs_expire_at),
      }));

      setRows(mapped);
      setTotal(j?.total ?? 0);
    } catch {
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  // Ladda vid mount & nÃ¤r filter Ã¤ndras
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, cls, expSoon, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function fmtDate(iso?: string | null) {
    if (!iso) return "â€”";
    return iso.slice(0, 10);
  }

  return (
    <>
      <AdminMenu />
      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-[#194C66]">ChauffÃ¶rer</h1>
            <Link
              href="/admin/drivers/new"
              className="px-4 py-2 rounded-[25px] bg-[#194C66] text-white text-sm"
            >
              + LÃ¤gg till chauffÃ¶r
            </Link>
          </div>

          {/* Filterrad */}
          <div className="bg-white rounded-xl shadow p-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <label className="text-sm text-[#194C66]/80">
                <span className="block mb-1">SÃ¶k (namn/e-post/telefon)</span>
                <input
                  value={search}
                  onChange={(e) => {
                    setPage(1);
                    setSearch(e.target.value);
                  }}
                  className="w-full border rounded px-2 py-1"
                  placeholder="Skriv fÃ¶r att sÃ¶kaâ€¦"
                />
              </label>

              <label className="text-sm text-[#194C66]/80">
                <span className="block mb-1">Status</span>
                <select
                  value={status}
                  onChange={(e) => {
                    setPage(1);
                    setStatus(e.target.value as any);
                  }}
                  className="w-full border rounded px-2 py-1"
                >
                  <option value="">Alla</option>
                  <option value="aktiv">Aktiv</option>
                  <option value="inaktiv">Inaktiv</option>
                </select>
              </label>

              <label className="text-sm text-[#194C66]/80">
                <span className="block mb-1">KÃ¶rkortsklass</span>
                <input
                  value={cls}
                  onChange={(e) => {
                    setPage(1);
                    setCls(e.target.value.toUpperCase());
                  }}
                  className="w-full border rounded px-2 py-1"
                  placeholder="Ex. D eller DE"
                />
              </label>

              <label className="text-sm text-[#194C66]/80">
                <span className="block mb-1">Dokument gÃ¥r ut inom</span>
                <select
                  value={expSoon}
                  onChange={(e) => {
                    setPage(1);
                    setExpSoon(Number(e.target.value) as any);
                  }}
                  className="w-full border rounded px-2 py-1"
                >
                  <option value={0}>Ingen filter</option>
                  <option value={30}>30 dagar</option>
                  <option value={60}>60 dagar</option>
                  <option value={90}>90 dagar</option>
                </select>
              </label>

              <label className="text-sm text-[#194C66]/80">
                <span className="block mb-1">Rader per sida</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPage(1);
                    setPageSize(Number(e.target.value));
                  }}
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
                <col className="w-[220px]" />
                <col className="w-[140px]" />
                <col className="w-[220px]" />
                <col className="w-[140px]" />
                <col />
                <col className="w-[120px]" />
              </colgroup>
              <thead>
                <tr className="text-left text-sm text-[#194C66]/70 select-none">
                  <th className="px-4 py-2 font-bold">Namn</th>
                  <th className="px-4 py-2 font-bold">Telefon</th>
                  <th className="px-4 py-2 font-bold">E-post</th>
                  <th className="px-4 py-2 font-bold">Klasser</th>
                  <th className="px-4 py-2 font-bold">Status</th>
                  <th className="px-4 py-2 font-bold">Uppdaterad</th>
                </tr>
              </thead>
              <tbody className="text-[15px] text-[#194C66]">
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-[#194C66]/60">
                      Laddarâ€¦
                    </td>
                  </tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-[#194C66]/60">
                      Inga chauffÃ¶rer hittades.
                    </td>
                  </tr>
                )}

                {!loading &&
                  rows.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b last:border-b-0 border-[#E5E7EB]/80 hover:bg-[#194C66]/5"
                    >
                      <td className="px-4 py-3">
                        <Link href={`/admin/drivers/${r.id}`} className="font-semibold underline">
                          {r.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{r.phone}</td>
                      <td className="px-4 py-3">{r.email}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.license_classes?.length ? r.license_classes.join(", ") : "â€”"}
                      </td>
                      <td className="px-4 py-3">
                        <DriverStatusPill active={r.active} docTag={r.docStatus.tag} />
                      </td>
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
                {rows.length === 0 ? 0 : (page - 1) * pageSize + 1}â€“
                {Math.min(page * pageSize, total)}
              </strong>{" "}
              av <strong className="text-[#194C66]">{total}</strong>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1 rounded border border-[#E5E7EB] disabled:opacity-40"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                FÃ¶regÃ¥ende
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
                NÃ¤sta
              </button>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

