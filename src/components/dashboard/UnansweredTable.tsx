// src/components/dashboard/UnansweredTable.tsx
import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/router";

export type UnansweredRow = {
  id: string;
  offer_number: string | null;
  from: string | null;
  to: string | null;
  pax: number | null;
  type: string | null;            // <- här fyller vi med enkel/tur&retur via API
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

function safeTime(t?: string | null) {
  if (!t) return "-";
  return /^\d{2}:\d{2}$/.test(t) ? t : "-";
}

// Översätt rått värde till “Enkelresa” / “Tur & retur”
function formatTripType(raw?: string | null): string {
  if (!raw) return "-";
  const v = raw.toLowerCase();

  if (["enkel", "enkelresa", "one_way"].includes(v)) return "Enkelresa";
  if (
    ["tur_retur", "tur & retur", "tur-retur", "tur_och_ret", "retur"].includes(
      v
    )
  )
    return "Tur & retur";

  // fallback om något oväntat värde dyker upp
  return raw;
}

export default function UnansweredTable({
  rows,
  title = "Obesvarade offerter",
  onAnswered,
}: Props) {
  const router = useRouter();

  // pageSize kan vara siffra eller "all"
  const [pageSize, setPageSize] = useState<number | "all">(10);
  const [page, setPage] = useState(1);

  // hoppa tillbaka till sida 1 om man byter antal rader
  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  // bara de som inte är besvarade/godkända
  const filtered = useMemo(
    () =>
      (rows || []).filter((r) => {
        const s = (r.status ?? "").toLowerCase();
        return !["besvarad", "answered", "godkänd", "godkand", "approved"].includes(
          s
        );
      }),
    [rows]
  );

  const total = filtered.length;

  const totalPages =
    pageSize === "all" ? 1 : Math.max(1, Math.ceil(total / pageSize));

  const clampedPage = pageSize === "all" ? 1 : Math.min(page, totalPages);

  const start =
    pageSize === "all" ? 0 : (clampedPage - 1) * (pageSize as number);
  const end = pageSize === "all" ? total : start + (pageSize as number);

  const pageRows =
    pageSize === "all" ? filtered : filtered.slice(start, end);

  function goToOffer(row: UnansweredRow) {
    router.push(`/admin/offers/${row.id}`);
    if (onAnswered) onAnswered(row.id);
  }

  return (
    <div className="w-full">
      {/* Header-rad */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <h2
          className="text-lg font-semibold tracking-tight"
          style={{ color: TITLE_COLOR }}
        >
          {title}
        </h2>
        <div className="flex-1" />
        <div className="flex items-center gap-2 text-sm text-[#6B7280]">
          <span>Visa</span>
          <select
            value={pageSize}
            onChange={(e) => {
              const val = e.target.value;
              setPageSize(val === "all" ? "all" : Number(val));
            }}
            className="border border-gray-300 rounded-lg px-2 py-1 text-sm bg-white"
          >
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={20}>20</option>
            <option value="all">Alla</option>
          </select>
          <span>rader</span>
        </div>
      </div>

      {/* Tabell */}
      <div className="mt-1 overflow-x-auto">
        <table className="min-w-full table-fixed border-separate border-spacing-0">
          <colgroup>
            <col className="w-[120px]" />
            <col className="w-[120px]" />
            <col className="w-[80px]" />
            <col />
            <col />
            <col className="w-[110px]" />
            <col className="w-[140px]" />
            <col className="w-[120px]" />
          </colgroup>
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-[#6B7280] select-none border-b border-gray-100">
              <th className="px-4 py-2 font-semibold whitespace-nowrap">
                Offert-ID
              </th>
              <th className="px-4 py-2 font-semibold whitespace-nowrap">
                Avresa
              </th>
              <th className="px-4 py-2 font-semibold whitespace-nowrap">
                Tid
              </th>
              <th className="px-4 py-2 font-semibold whitespace-nowrap">
                Från
              </th>
              <th className="px-4 py-2 font-semibold whitespace-nowrap">
                Till
              </th>
              <th className="px-4 py-2 font-semibold whitespace-nowrap">
                Passagerare
              </th>
              <th className="px-4 py-2 font-semibold whitespace-nowrap">
                Typ av resa
              </th>
              <th className="px-4 py-2 font-semibold text-right whitespace-nowrap">
                {/* tom rubrik för knappen */}
              </th>
            </tr>
          </thead>
          <tbody className="text-[14px] text-[#111827]">
            {pageRows.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-6 text-center text-[#6B7280]"
                >
                  Inga obesvarade offerter 🎉
                </td>
              </tr>
            )}

            {pageRows.map((r) => {
              const date = safeDate(r.departure_date);
              const time = safeTime(r.departure_time);
              const tripType = formatTripType(r.type);

              return (
                <tr
                  key={r.id}
                  className="border-b last:border-b-0 border-[#E5E7EB]/80 transition-colors hover:bg-[#F3F4F6]"
                >
                  <td className="px-4 py-3 whitespace-nowrap font-semibold text-[#111827]">
                    {r.offer_number ?? r.id}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{date}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{time}</td>
                  <td className="px-4 py-3 truncate max-w-[160px]">
                    {r.from || "-"}
                  </td>
                  <td className="px-4 py-3 truncate max-w-[160px]">
                    {r.to || "-"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {r.pax ?? "-"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {tripType}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => goToOffer(r)}
                        className="inline-flex items-center h-9 px-4 rounded-full text-white text-sm font-medium shadow-sm transition-colors"
                        style={{ backgroundColor: TITLE_COLOR }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = "#143a4e")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor = TITLE_COLOR)
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

      {/* Paginering */}
      {total > 0 && (
        <div className="px-4 py-3 flex items-center gap-3 text-sm text-[#6B7280]">
          <span>
            Visar{" "}
            <strong className="text-[#111827]">
              {total === 0 ? 0 : start + 1}–{Math.min(end, total)}
            </strong>{" "}
            av{" "}
            <strong className="text-[#111827]">
              {total}
            </strong>
          </span>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 rounded-full border border-[#E5E7EB] bg-white text-[#111827] disabled:opacity-40 disabled:bg-gray-50"
              onClick={() =>
                setPage((p) => Math.max(1, p - 1))
              }
              disabled={pageSize === "all" || clampedPage <= 1}
            >
              Föregående
            </button>
            <span>
              Sida{" "}
              <strong className="text-[#111827]">
                {clampedPage}
              </strong>{" "}
              av{" "}
              <strong className="text-[#111827]">
                {totalPages}
              </strong>
            </span>
            <button
              className="px-3 py-1 rounded-full border border-[#E5E7EB] bg-white text-[#111827] disabled:opacity-40 disabled:bg-gray-50"
              onClick={() =>
                setPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={pageSize === "all" || clampedPage >= totalPages}
            >
              Nästa
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
