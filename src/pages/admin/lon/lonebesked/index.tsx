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
};

type PayslipRow = {
  id: string;
  payroll_run_id?: string | null;
  employee_name_snapshot?: string | null;
  employee_role_snapshot?: string | null;
  pay_type?: string | null;
  hours?: number | null;
  hourly_rate?: number | null;
  monthly_salary?: number | null;
  vacation_percent?: number | null;
  gross_base?: number | null;
  vacation_pay?: number | null;
  gross_total?: number | null;
  preliminary_tax_percent?: number | null;
  preliminary_tax_amount?: number | null;
  net_pay?: number | null;
  payout_amount?: number | null;
  employer_fee?: number | null;
  total_cost?: number | null;
  status?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type ApiResponse = {
  ok: boolean;
  needsSetup?: boolean;
  runs?: PayrollRun[];
  payslips?: PayslipRow[];
  summary?: {
    total: number;
    draft: number;
    approved: number;
    sent: number;
    paid: number;
    grossTotal: number;
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

function roleLabel(role?: string | null) {
  switch (role) {
    case "driver":
      return "Chaufför";
    case "traffic_manager":
      return "Trafikledare";
    case "booking_agent":
      return "Bokningsagent";
    case "admin":
      return "Administratör";
    case "employee":
      return "Anställd";
    default:
      return role || "Personal";
  }
}

function payTypeLabel(type?: string | null) {
  switch (type) {
    case "hourly":
      return "Timlön";
    case "monthly":
      return "Månadslön";
    default:
      return type || "Lönetyp";
  }
}

function statusLabel(status?: string | null) {
  switch (status) {
    case "draft":
      return "Utkast";
    case "approved":
      return "Godkänd";
    case "sent":
      return "Skickad";
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
    case "approved":
      return "bg-blue-100 text-blue-700";
    case "sent":
      return "bg-purple-100 text-purple-700";
    case "cancelled":
      return "bg-red-100 text-red-700";
    case "draft":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function LonLonebeskedListPage() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [payslips, setPayslips] = useState<PayslipRow[]>([]);
  const [summary, setSummary] = useState<ApiResponse["summary"]>({
    total: 0,
    draft: 0,
    approved: 0,
    sent: 0,
    paid: 0,
    grossTotal: 0,
    totalCost: 0,
  });

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [runId, setRunId] = useState("");
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function getRun(id?: string | null) {
    return runs.find((run) => run.id === id);
  }

  async function loadPayslips() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      if (runId) params.set("payroll_run_id", runId);

      const res = await fetch("/api/admin/lon/lonebesked?" + params.toString());
      const json: ApiResponse = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta lönebesked.");
      }

      setRuns(json.runs || []);
      setPayslips(json.payslips || []);
      setSummary(json.summary || { total: 0, draft: 0, approved: 0, sent: 0, paid: 0, grossTotal: 0, totalCost: 0 });
      setNeedsSetup(Boolean(json.needsSetup));
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPayslips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTotal = useMemo(() => payslips.length, [payslips]);

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
                  Lönebesked
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Visa lönebesked från skapade lönekörningar. Nästa steg blir PDF och export.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href="/admin/lon/lonekoring"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Pågående löner
                </a>

                <button
                  type="button"
                  onClick={loadPayslips}
                  className="inline-flex items-center justify-center rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3548]"
                >
                  Uppdatera
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-6">
              <SummaryCard label="Totalt" value={summary?.total || 0} />
              <SummaryCard label="Utkast" value={summary?.draft || 0} tone="amber" />
              <SummaryCard label="Godkända" value={summary?.approved || 0} tone="blue" />
              <SummaryCard label="Skickade" value={summary?.sent || 0} tone="slate" />
              <SummaryCard label="Betalda" value={summary?.paid || 0} tone="green" />
              <SummaryCard label="Brutto" valueText={fmtMoney(summary?.grossTotal || 0)} tone="green" />
            </div>

            {needsSetup && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800 shadow-sm">
                Tabellerna för lönekörning saknas. Skapa lönekörningstabellerna först.
              </section>
            )}

            {error && (
              <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
                {error}
              </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[1fr_300px_220px_140px]">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Sök
                  </label>
                  <input
                    value={q}
                    onChange={(event) => setQ(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") loadPayslips();
                    }}
                    placeholder="Sök anställd, lönekörning eller anteckning..."
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                  />
                </div>

                <SelectField
                  label="Lönekörning"
                  value={runId}
                  onChange={setRunId}
                  options={[
                    ["", "Alla lönekörningar"],
                    ...runs.map((run) => [
                      run.id,
                      (run.title || "Lönekörning") + " · " + fmtDate(run.period_start) + " - " + fmtDate(run.period_end),
                    ] as [string, string]),
                  ]}
                />

                <SelectField
                  label="Status"
                  value={status}
                  onChange={setStatus}
                  options={[
                    ["", "Alla"],
                    ["draft", "Utkast"],
                    ["approved", "Godkända"],
                    ["sent", "Skickade"],
                    ["paid", "Betalda"],
                    ["cancelled", "Avbrutna"],
                  ]}
                />

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={loadPayslips}
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
                    Lönebesked
                  </h2>
                  <p className="text-sm text-slate-500">
                    Visar {filteredTotal} lönebesked
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1280px] w-full border-collapse text-left text-sm">
                  <thead className="bg-[#194C66] text-white">
                    <tr>
                      <Th>Anställd</Th>
                      <Th>Lönekörning</Th>
                      <Th>Period</Th>
                      <Th>Utbetalning</Th>
                      <Th>Lönetyp</Th>
                      <Th>Timmar</Th>
                      <Th>Brutto</Th>
                      <Th>Skatt</Th>
                      <Th>Nettolön</Th>
                      <Th>Semester</Th>
                      <Th>Status</Th>
                      <Th>Anteckning</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={12} className="px-5 py-8 text-center text-slate-500">
                          Laddar lönebesked...
                        </td>
                      </tr>
                    ) : payslips.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="px-5 py-10 text-center">
                          <div className="mx-auto max-w-lg">
                            <div className="text-base font-bold text-[#194C66]">
                              Inga lönebesked hittades
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              Skapa en lönekörning först. Då skapas lönebesked per anställd.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      payslips.map((payslip) => {
                        const run = getRun(payslip.payroll_run_id);

                        return (
                          <tr
                            key={payslip.id}
                            onClick={() => {
                              window.location.href = "/admin/lon/lonebesked/" + encodeURIComponent(payslip.id);
                            }}
                            className="cursor-pointer align-top transition hover:bg-slate-50"
                          >
                            <Td>
                              <div className="font-bold text-[#194C66]">
                                {payslip.employee_name_snapshot || "Anställd"}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {roleLabel(payslip.employee_role_snapshot)}
                              </div>
                            </Td>

                            <Td>{run?.title || "—"}</Td>
                            <Td>{fmtDate(run?.period_start)} – {fmtDate(run?.period_end)}</Td>
                            <Td>{fmtDate(run?.payout_date)}</Td>
                            <Td>{payTypeLabel(payslip.pay_type)}</Td>
                            <Td>{fmtNumber(payslip.hours)} h</Td>
                            <Td>
                              <strong>{fmtMoney(payslip.gross_total)}</strong>
                            </Td>
                            <Td>
                              <strong className="text-red-700">{fmtMoney(payslip.preliminary_tax_amount)}</strong>
                              <div className="mt-1 text-xs text-slate-500">
                                {fmtNumber(payslip.preliminary_tax_percent)} %
                              </div>
                            </Td>
                            <Td>
                              <strong className="text-emerald-700">{fmtMoney(payslip.net_pay || payslip.payout_amount)}</strong>
                            </Td>
                            <Td>{fmtMoney(payslip.vacation_pay)} ({fmtNumber(payslip.vacation_percent)} %)</Td>

                            <Td>
                              <span className={"inline-flex rounded-full px-3 py-1 text-xs font-semibold " + statusClass(payslip.status)}>
                                {statusLabel(payslip.status)}
                              </span>
                            </Td>

                            <Td>
                              <div className="max-w-[260px] truncate text-slate-600">
                                {payslip.notes || "—"}
                              </div>
                            </Td>
                          </tr>
                        );
                      })
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
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
      >
        {options.map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return (
    <th className="whitespace-nowrap px-5 py-4 text-xs font-bold uppercase tracking-wide">
      {children}
    </th>
  );
}

function Td({ children }: { children: ReactNode }) {
  return <td className="px-5 py-4">{children}</td>;
}
