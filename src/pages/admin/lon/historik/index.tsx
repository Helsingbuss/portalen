import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type PayrollRun = {
  id: string;
  title?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  payout_date?: string | null;
  status?: string | null;
  total_employees?: number | null;
  total_hours?: number | null;
  total_gross?: number | null;
  total_preliminary_tax?: number | null;
  total_net_pay?: number | null;
  total_payout_amount?: number | null;
  total_cost?: number | null;
  archived_at?: string | null;
  archive_notes?: string | null;
  bank_export_reference?: string | null;
  created_at?: string | null;
};

type ApiResponse = {
  ok: boolean;
  needsSetup?: boolean;
  runs?: PayrollRun[];
  summary?: {
    total: number;
    draft: number;
    approved: number;
    exported: number;
    bankSent: number;
    paid: number;
    cancelled: number;
    archived: number;
    totalGross: number;
    totalTax: number;
    totalNet: number;
    totalCost: number;
  };
  error?: string;
};

function fmtMoney(value?: number | null) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function fmtNumber(value?: number | null) {
  return new Intl.NumberFormat("sv-SE", {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function fmtDate(value?: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("sv-SE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function fmtDateTime(value?: string | null) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString("sv-SE");
  } catch {
    return value;
  }
}

function statusLabel(status?: string | null) {
  switch (status) {
    case "draft":
      return "Utkast";
    case "approved":
      return "Godkänd";
    case "exported":
      return "Exporterad";
    case "bank_sent":
      return "Skickad till bank";
    case "paid":
      return "Betald";
    case "cancelled":
      return "Avbruten";
    default:
      return status || "Status";
  }
}

function statusClass(status?: string | null) {
  switch (status) {
    case "paid":
      return "bg-emerald-100 text-emerald-700";
    case "bank_sent":
      return "bg-cyan-100 text-cyan-700";
    case "approved":
      return "bg-blue-100 text-blue-700";
    case "exported":
      return "bg-purple-100 text-purple-700";
    case "cancelled":
      return "bg-red-100 text-red-700";
    case "draft":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function yearOptions() {
  const current = new Date().getFullYear();
  const years: [string, string][] = [["", "Alla år"]];

  for (let y = current + 1; y >= current - 5; y--) {
    years.push([String(y), String(y)]);
  }

  return years;
}

const monthOptions: [string, string][] = [
  ["", "Alla månader"],
  ["01", "Januari"],
  ["02", "Februari"],
  ["03", "Mars"],
  ["04", "April"],
  ["05", "Maj"],
  ["06", "Juni"],
  ["07", "Juli"],
  ["08", "Augusti"],
  ["09", "September"],
  ["10", "Oktober"],
  ["11", "November"],
  ["12", "December"],
];

export default function LonHistorikPage() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [summary, setSummary] = useState<ApiResponse["summary"]>({
    total: 0,
    draft: 0,
    approved: 0,
    exported: 0,
    bankSent: 0,
    paid: 0,
    cancelled: 0,
    archived: 0,
    totalGross: 0,
    totalTax: 0,
    totalNet: 0,
    totalCost: 0,
  });

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState("");
  const [archived, setArchived] = useState("");

  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadHistory() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      if (year) params.set("year", year);
      if (month) params.set("month", month);
      if (archived) params.set("archived", archived);

      const res = await fetch("/api/admin/lon/historik?" + params.toString());
      const json: ApiResponse = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta historik.");
      }

      setRuns(json.runs || []);
      setSummary(json.summary || {
        total: 0,
        draft: 0,
        approved: 0,
        exported: 0,
        bankSent: 0,
        paid: 0,
        cancelled: 0,
        archived: 0,
        totalGross: 0,
        totalTax: 0,
        totalNet: 0,
        totalCost: 0,
      });
      setNeedsSetup(Boolean(json.needsSetup));
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTotal = useMemo(() => runs.length, [runs]);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="px-6 pb-8 pt-10">
          <div className="w-full space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00645d]">
                  Lön
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  Historik / arkiv
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Här samlas gamla lönekörningar, betalda löner, avbrutna körningar och arkiverade löneperioder.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href="/admin/lon/status"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Exportstatus
                </a>

                <button
                  type="button"
                  onClick={loadHistory}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3548] disabled:opacity-60"
                >
                  {loading ? "Hämtar..." : "Uppdatera"}
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-6">
              <SummaryCard label="Totalt" value={summary?.total || 0} />
              <SummaryCard label="Betalda" value={summary?.paid || 0} tone="green" />
              <SummaryCard label="Arkiverade" value={summary?.archived || 0} tone="slate" />
              <SummaryCard label="Brutto" valueText={fmtMoney(summary?.totalGross || 0)} tone="blue" />
              <SummaryCard label="Skatt" valueText={fmtMoney(summary?.totalTax || 0)} tone="red" />
              <SummaryCard label="Netto" valueText={fmtMoney(summary?.totalNet || 0)} tone="green" />
            </div>

            {needsSetup && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800 shadow-sm">
                Arkivkolumnerna saknas på <strong>payroll_runs</strong>. Kör SQL-koden nedan först.
              </section>
            )}

            {error && (
              <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 shadow-sm">
                {error}
              </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[1fr_180px_180px_180px_180px_140px]">
                <Field
                  label="Sök"
                  value={q}
                  onChange={setQ}
                  onEnter={loadHistory}
                  placeholder="Sök titel, status, referens..."
                />

                <SelectField
                  label="Status"
                  value={status}
                  onChange={setStatus}
                  options={[
                    ["", "Alla"],
                    ["draft", "Utkast"],
                    ["approved", "Godkända"],
                    ["exported", "Exporterade"],
                    ["bank_sent", "Skickade till bank"],
                    ["paid", "Betalda"],
                    ["cancelled", "Avbrutna"],
                  ]}
                />

                <SelectField label="År" value={year} onChange={setYear} options={yearOptions()} />
                <SelectField label="Månad" value={month} onChange={setMonth} options={monthOptions} />

                <SelectField
                  label="Arkiv"
                  value={archived}
                  onChange={setArchived}
                  options={[
                    ["", "Alla"],
                    ["true", "Arkiverade"],
                    ["false", "Ej arkiverade"],
                  ]}
                />

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={loadHistory}
                    className="w-full rounded-xl bg-[#00645d] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#004f49]"
                  >
                    Filtrera
                  </button>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Lönehistorik
                  </h2>
                  <p className="text-sm text-slate-500">
                    Visar {filteredTotal} lönekörningar
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1500px] w-full border-collapse text-left text-sm">
                  <thead className="bg-[#194C66] text-white">
                    <tr>
                      <Th>Lönekörning</Th>
                      <Th>Period</Th>
                      <Th>Utbetalning</Th>
                      <Th>Status</Th>
                      <Th>Personal</Th>
                      <Th>Timmar</Th>
                      <Th>Brutto</Th>
                      <Th>Skatt</Th>
                      <Th>Netto</Th>
                      <Th>Total kostnad</Th>
                      <Th>Arkiv</Th>
                      <Th>Referens</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={12} className="px-5 py-8 text-center text-slate-500">
                          Laddar historik...
                        </td>
                      </tr>
                    ) : runs.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="px-5 py-10 text-center text-slate-500">
                          Ingen historik hittades.
                        </td>
                      </tr>
                    ) : (
                      runs.map((run) => (
                        <tr
                          key={run.id}
                          onClick={() => {
                            window.location.href = "/admin/lon/historik/" + encodeURIComponent(run.id);
                          }}
                          className="cursor-pointer align-top transition hover:bg-slate-50"
                        >
                          <Td>
                            <div className="font-bold text-[#194C66]">
                              {run.title || "Lönekörning"}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              Skapad {fmtDate(run.created_at)}
                            </div>
                          </Td>

                          <Td>{fmtDate(run.period_start)} – {fmtDate(run.period_end)}</Td>
                          <Td>{fmtDate(run.payout_date)}</Td>
                          <Td>
                            <span className={"inline-flex rounded-full px-3 py-1 text-xs font-semibold " + statusClass(run.status)}>
                              {statusLabel(run.status)}
                            </span>
                          </Td>
                          <Td>{run.total_employees || 0}</Td>
                          <Td>{fmtNumber(run.total_hours)} h</Td>
                          <Td>{fmtMoney(run.total_gross)}</Td>
                          <Td>{fmtMoney(run.total_preliminary_tax)}</Td>
                          <Td>
                            <strong>{fmtMoney(run.total_net_pay || run.total_payout_amount)}</strong>
                          </Td>
                          <Td>{fmtMoney(run.total_cost)}</Td>
                          <Td>
                            {run.archived_at ? (
                              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                Arkiverad
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                                Ej arkiverad
                              </span>
                            )}
                            <div className="mt-1 text-xs text-slate-500">
                              {fmtDateTime(run.archived_at)}
                            </div>
                          </Td>
                          <Td>
                            <div className="max-w-[220px] truncate text-slate-600">
                              {run.bank_export_reference || run.archive_notes || "—"}
                            </div>
                          </Td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </main>
      </div>
    </>
  );
}

function SummaryCard({
  label,
  value,
  valueText,
  tone,
}: {
  label: string;
  value?: number;
  valueText?: string;
  tone?: "green" | "amber" | "red" | "blue" | "slate";
}) {
  const color =
    tone === "green"
      ? "text-emerald-700 bg-emerald-50"
      : tone === "amber"
        ? "text-amber-700 bg-amber-50"
        : tone === "red"
          ? "text-red-700 bg-red-50"
          : tone === "blue"
            ? "text-blue-700 bg-blue-50"
            : tone === "slate"
              ? "text-slate-700 bg-slate-50"
              : "text-[#194C66] bg-white";

  return (
    <div className={"rounded-2xl border border-slate-200 p-5 shadow-sm " + color}>
      <div className="text-sm font-semibold opacity-80">{label}</div>
      <div className="mt-2 text-2xl font-bold">{valueText || value || 0}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  onEnter,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && onEnter) onEnter();
        }}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
      >
        {options.map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="whitespace-nowrap px-5 py-4 text-xs font-bold uppercase tracking-wide">{children}</th>;
}

function Td({ children }: { children: ReactNode }) {
  return <td className="px-5 py-4">{children}</td>;
}
