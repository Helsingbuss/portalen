// src/components/dashboard/UnansweredTable.tsx
import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/router";

export type UnansweredRow = {
  id: string;
  offer_number: string | null;
  from: string | null;
  to: string | null;
  pax: number | null;
  type: string | null;
  departure_date: string | null;   // YYYY-MM-DD
  departure_time: string | null;   // HH:mm
  status?: string | null;          // "inkommen" | "besvarad" | ...
};

type Props = {
  rows: UnansweredRow[];
  title?: string;
  // Valfri callback om du vill uppdatera listan när en offert har besvarats
  onAnswered?: (id: string) => void;
};

const TITLE_COLOR = "#194C66";

/* Helpers */
function safeDate(iso?: string | null) {
  if (!iso) return "-";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return "-";
  const [, y, mm, dd] = m;
  if (mm === "00" || dd === "00") return "-";
  return `${y}-${mm}-${dd}`;
}

function safeTime(t?: string | null) {
  if (!t) return "-";
  return /^\d{2}:\d{2}$/.test(t) ? t : "-";
}

export default function UnansweredTable({
  rows,
  title = "Obesvarade offerter",
  onAnswered,
}: Props) {
  const router = useRouter();

  // --- Visningsinställningar ---
  const [pageSize, setPageSize] = useState(5);
  const [page, setPage] = useState(1);

  // Om du någon gång byter pageSize – gå till första sidan
  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  // Filtrera bort "besvarad" (säkerhetsfilter utöver ditt API)
  const filtered = useMemo(() => {
    return (rows || []).filter(
      (r) => (r.status ?? "").toLowerCase() !== "besvarad"
    );
  }, [rows]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const start = (clampedPage - 1) * pageSize;
  const end = start + pageSize;
  const pageRows = filtered.slice(start, end);

  function goToOffer(row: UnansweredRow) {
    const key = row.id; // eller row.offer_number ?? row.id
    router.push(`/offert/${key}`);
    // Om du vill plocka bort raden direkt lokalt när man klickar:
    if (onAnswered) onAnswered(row.id);
  }

  return (
    <div className="w-full">
      {/* Rubrik + visningskontroller */}
      <div className="px-4 pt-4 flex items-center gap-3">
        <h2 className="text-lg font-semibold" style={{ color: TITLE_COLOR }}>
          {title}
        </h2>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Page size-väljare */}
        <div className="flex items-center gap-2 text-sm text-[#194C66]/80">
          <span>Visa</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={15}>15</option>
          </select>
          <span>rader</span>
        </div>
      </div>

      <div className="mt-2 overflow-x-auto">
        <table className="min-w-full table-fixed border-separate border-spacing-0">
          <colgroup>
            <col className="w-[120px]" />
            <col className="w-[120px]" />
            <col className="w-[90px]" />
            <col />
            <col />
            <col className="w-[140px]" />
            <col className="w-[130px]" />
            <col className="w-[120px]" />
          </colgroup>

          <thead>
  <tr className="text-left text-sm text-[#194C66]/70 select-none">
    {/* Rubriker: fet stil + alltid en rad */}
    <th className="px-4 py-2 font-semibold whitespace-nowrap">Offert-ID</th>
    <th className="px-4 py-2 font-semibold whitespace-nowrap">Avresa</th>
    <th className="px-4 py-2 font-semibold whitespace-nowrap">Tid</th>
    <th className="px-4 py-2 font-semibold whitespace-nowrap">Från</th>
    <th className="px-4 py-2 font-semibold whitespace-nowrap">Till</th>
    <th className="px-4 py-2 font-semibold whitespace-nowrap">Passagerare</th>
    <th className="px-4 py-2 font-semibold whitespace-nowrap">Resa</th>
    <th className="px-4 py-2 font-semibold text-right whitespace-nowrap"> </th>
  </tr>
</thead>


          <tbody className="text-[15px] text-[#194C66]">
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-[#194C66]/60">
                  Inga obesvarade offerter 🎉
                </td>
              </tr>
            )}

            {pageRows.map((r) => {
              const date = safeDate(r.departure_date);
              const time = safeTime(r.departure_time);

              return (
                <tr
                  key={r.id}
                  className="border-b last:border-b-0 border-[#E5E7EB]/80 transition-colors hover:bg-[#194C66]/5"
                >
                  <td className="px-4 py-3 whitespace-nowrap font-semibold">
                    {r.offer_number ?? r.id}
                  </td>

                  {/* Avresa / Tid: enradiga */}
                  <td className="px-4 py-3 whitespace-nowrap">{date}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{time}</td>

                  {/* Från/Till får gärna radbrytas */}
                  <td className="px-4 py-3">{r.from || "-"}</td>
                  <td className="px-4 py-3">{r.to || "-"}</td>

                  {/* Inga "PAX" – bara siffran */}
                  <td className="px-4 py-3 whitespace-nowrap">{r.pax ?? "-"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.type || "-"}</td>

                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => goToOffer(r)}
                        className="inline-flex items-center h-9 px-4 rounded-full text-white text-sm transition-colors"
                        style={{ backgroundColor: TITLE_COLOR }}
                        onMouseEnter={(e) =>
                          ((e.currentTarget.style.backgroundColor = "#143a4e"))
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget.style.backgroundColor = TITLE_COLOR))
                        }
                      >
                        Besvara
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      {total > 0 && (
        <div className="px-4 py-3 flex items-center gap-3 text-sm text-[#194C66]/80">
          <span>
            Visar{" "}
            <strong className="text-[#194C66]">
              {total === 0 ? 0 : start + 1}–{Math.min(end, total)}
            </strong>{" "}
            av <strong className="text-[#194C66]">{total}</strong>
          </span>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 rounded border border-[#E5E7EB] disabled:opacity-40"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={clampedPage <= 1}
            >
              Föregående
            </button>
            <span>
              Sida <strong className="text-[#194C66]">{clampedPage}</strong> av{" "}
              <strong className="text-[#194C66]">{totalPages}</strong>
            </span>
            <button
              className="px-3 py-1 rounded border border-[#E5E7EB] disabled:opacity-40"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={clampedPage >= totalPages}
            >
              Nästa
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
