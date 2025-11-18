// src/components/dashboard/UnansweredTable.tsx
import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/router";
// âš ï¸ togs bort: import av supabaseClient (den anvÃ¤ndes inte)

export type UnansweredRow = {
  id: string;
  offer_number: string | null;
  from: string | null;
  to: string | null;
  pax: number | null;
  type: string | null;
  departure_date: string | null;
  departure_time: string | null;
  status?: string | null;
};

type Props = {
  rows: UnansweredRow[];
  title?: string;
  onAnswered?: (id: string) => void;
};

const TITLE_COLOR = "#194C66";

function safeDate(iso?: string | null) {
  if (!iso) return "-";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return "-";
  const [, y, mm, dd] = m;
  if (mm === "00" || dd === "00") return "-";
  return `${y}-${mm}-${dd}`;
}
function safeTime(t?: string | null) { if (!t) return "-"; return /^\d{2}:\d{2}$/.test(t) ? t : "-"; }

export default function UnansweredTable({ rows, title = "Obesvarade offerter", onAnswered }: Props) {
  const router = useRouter();
  const [pageSize, setPageSize] = useState(5);
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [pageSize]);

  const filtered = useMemo(() => (rows || []).filter(r => (r.status ?? "").toLowerCase() !== "besvarad"), [rows]);
  const total = filtered.length, totalPages = Math.max(1, Math.ceil(total / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const start = (clampedPage - 1) * pageSize, end = start + pageSize;
  const pageRows = filtered.slice(start, end);

  function goToOffer(row: UnansweredRow) {
    router.push(`/admin/offers/${row.id}`);
    if (onAnswered) onAnswered(row.id);
  }

  return (
    <div className="w-full">
      <div className="px-4 pt-4 flex items-center gap-3">
        <h2 className="text-lg font-semibold" style={{ color: TITLE_COLOR }}>{title}</h2>
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-sm text-[#194C66]/80">
          <span>Visa</span>
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="border rounded px-2 py-1 text-sm">
            <option value={5}>5</option><option value={10}>10</option><option value={15}>15</option>
          </select>
          <span>rader</span>
        </div>
      </div>

      <div className="mt-2 overflow-x-auto">
        <table className="min-w-full table-fixed border-separate border-spacing-0">
          <colgroup>
            <col className="w-[120px]" /><col className="w-[120px]" /><col className="w-[90px]" />
            <col /><col /><col className="w-[140px]" /><col className="w-[130px]" /><col className="w-[120px]" />
          </colgroup>
          <thead>
            <tr className="text-left text-sm text-[#194C66]/70 select-none">
              <th className="px-4 py-2 font-bold whitespace-nowrap">Offert-ID</th>
              <th className="px-4 py-2 font-bold whitespace-nowrap">Avresa</th>
              <th className="px-4 py-2 font-bold whitespace-nowrap">Tid</th>
              <th className="px-4 py-2 font-bold whitespace-nowrap">FrÃ¥n</th>
              <th className="px-4 py-2 font-bold whitespace-nowrap">Till</th>
              <th className="px-4 py-2 font-bold whitespace-nowrap">Passagerare</th>
              <th className="px-4 py-2 font-bold whitespace-nowrap">Typ av resa</th>
              <th className="px-4 py-2 font-bold text-right whitespace-nowrap"> </th>
            </tr>
          </thead>
          <tbody className="text-[15px] text-[#194C66]">
            {pageRows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-[#194C66]/60">Inga obesvarade offerter ðŸŽ‰</td></tr>
            )}
            {pageRows.map((r) => {
              const date = safeDate(r.departure_date);
              const time = safeTime(r.departure_time);
              return (
                <tr key={r.id} className="border-b last:border-b-0 border-[#E5E7EB]/80 transition-colors hover:bg-[#194C66]/5">
                  <td className="px-4 py-3 whitespace-nowrap font-semibold">{r.offer_number ?? r.id}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{date}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{time}</td>
                  <td className="px-4 py-3">{r.from || "-"}</td>
                  <td className="px-4 py-3">{r.to || "-"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.pax ?? "-"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.type || "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => goToOffer(r)}
                        className="inline-flex items-center h-9 px-4 rounded-full text-white text-sm transition-colors"
                        style={{ backgroundColor: TITLE_COLOR }}
                        onMouseEnter={(e) => ((e.currentTarget.style.backgroundColor = "#143a4e"))}
                        onMouseLeave={(e) => ((e.currentTarget.style.backgroundColor = TITLE_COLOR))}
                      >Besvara</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div className="px-4 py-3 flex items-center gap-3 text-sm text-[#194C66]/80">
          <span>Visar <strong className="text-[#194C66]">{total === 0 ? 0 : start + 1}â€“{Math.min(end, total)}</strong> av <strong className="text-[#194C66]">{total}</strong></span>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 rounded border border-[#E5E7EB] disabled:opacity-40" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={clampedPage <= 1}>FÃ¶regÃ¥ende</button>
            <span>Sida <strong className="text-[#194C66]">{clampedPage}</strong> av <strong className="text-[#194C66]">{totalPages}</strong></span>
            <button className="px-3 py-1 rounded border border-[#E5E7EB] disabled:opacity-40" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={clampedPage >= totalPages}>NÃ¤sta</button>
          </div>
        </div>
      )}
    </div>
  );
}

