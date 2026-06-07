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

type BankRow = {
  payroll_row_id: string;
  employee_name: string;
  employee_role?: string | null;
  payslip_status?: string | null;
  gross_total: number;
  payout_amount: number;
  recipient_name: string;
  bank_name: string;
  clearing_number: string;
  account_number: string;
  iban: string;
  bic: string;
  missing_bank: boolean;
  can_export: boolean;
  notes?: string | null;
};

type ApiResponse = {
  ok: boolean;
  needsSetup?: boolean;
  missingBankTable?: boolean;
  runs?: PayrollRun[];
  selectedRun?: PayrollRun | null;
  rows?: BankRow[];
  summary?: {
    rows: number;
    ready: number;
    missingBank: number;
    zeroAmount: number;
    totalPayout: number;
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

function statusLabel(status?: string | null) {
  switch (status) {
    case "draft":
      return "Utkast";
    case "approved":
      return "Godkänd";
    case "sent":
      return "Skickad";
    case "exported":
      return "Exporterad";
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

function maskAccount(value?: string | null) {
  const text = String(value || "").replace(/\s/g, "");
  if (!text) return "—";
  if (text.length <= 4) return "****";
  return "**** " + text.slice(-4);
}

export default function LonBankfilPage() {
  const [mounted, setMounted] = useState(false);

  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [rows, setRows] = useState<BankRow[]>([]);
  const [summary, setSummary] = useState<ApiResponse["summary"]>({
    rows: 0,
    ready: 0,
    missingBank: 0,
    zeroAmount: 0,
    totalPayout: 0,
  });

  const [runId, setRunId] = useState("");
  const [needsSetup, setNeedsSetup] = useState(false);
  const [missingBankTable, setMissingBankTable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadBankfile(nextRunId = runId) {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (nextRunId) params.set("payroll_run_id", nextRunId);

      const res = await fetch("/api/admin/lon/bankfil?" + params.toString());
      const json: ApiResponse = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta bankunderlag.");
      }

      setRuns(json.runs || []);
      setSelectedRun(json.selectedRun || null);
      setRows(json.rows || []);
      setSummary(json.summary || {
        rows: 0,
        ready: 0,
        missingBank: 0,
        zeroAmount: 0,
        totalPayout: 0,
      });
      setNeedsSetup(Boolean(json.needsSetup));
      setMissingBankTable(Boolean(json.missingBankTable));

      if (!nextRunId && json.selectedRun?.id) {
        setRunId(json.selectedRun.id);
      }
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  function downloadCsv() {
    if (!selectedRun?.id) {
      setError("Välj en lönekörning först.");
      return;
    }

    window.location.href = "/api/admin/lon/bankfil/" + encodeURIComponent(selectedRun.id) + "/csv";
  }

  useEffect(() => {
    setMounted(true);
    loadBankfile("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTotal = useMemo(() => rows.length, [rows]);

  if (!mounted) {
    return (
      <>
        <AdminMenu />
        <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
          <Header />
          <main className="px-6 pb-8 pt-10">
            <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
              Laddar bankunderlag...
            </section>
          </main>
        </div>
      </>
    );
  }

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
                  Bankfil / utbetalningsunderlag
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Kontrollera bankuppgifter och belopp innan framtida Swedbank-fil. Detta är ett kontrollunderlag, inte en riktig bankfil ännu.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => loadBankfile(runId)}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3548] disabled:opacity-60"
                >
                  {loading ? "Hämtar..." : "Uppdatera"}
                </button>

                <button
                  type="button"
                  onClick={downloadCsv}
                  disabled={!selectedRun?.id || rows.length === 0}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Exportera bankunderlag CSV
                </button>
              </div>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[1fr_180px_180px]">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Välj lönekörning
                  </label>
                  <select
                    value={runId}
                    onChange={(event) => {
                      setRunId(event.target.value);
                      loadBankfile(event.target.value);
                    }}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                  >
                    <option value="">Välj lönekörning</option>
                    {runs.map((run) => (
                      <option key={run.id} value={run.id}>
                        {(run.title || "Lönekörning") + " · " + fmtDate(run.period_start) + " - " + fmtDate(run.period_end)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <a
                    href="/admin/lon/bankuppgifter"
                    className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#194C66] transition hover:bg-slate-50"
                  >
                    Bankuppgifter
                  </a>
                </div>

                <div className="flex items-end">
                  <a
                    href="/admin/lon/export"
                    className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#194C66] transition hover:bg-slate-50"
                  >
                    Löneexport
                  </a>
                </div>
              </div>

              {selectedRun && (
                <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  <strong className="text-[#194C66]">{selectedRun.title}</strong>
                  <div className="mt-1">
                    Period: {fmtDate(selectedRun.period_start)} – {fmtDate(selectedRun.period_end)}
                    {" · "}
                    Utbetalning: {fmtDate(selectedRun.payout_date)}
                    {" · "}
                    Status: {statusLabel(selectedRun.status)}
                  </div>
                </div>
              )}

              {needsSetup && (
                <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  Tabellerna för lönekörning saknas. Skapa lönekörning först.
                </div>
              )}

              {missingBankTable && (
                <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  Tabellen för bankuppgifter saknas. Skapa Bankuppgifter först och kör SQL-koden för den sidan.
                </div>
              )}

              {error && (
                <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}
            </section>

            <div className="grid gap-4 md:grid-cols-5">
              <SummaryCard label="Rader" value={summary?.rows || 0} />
              <SummaryCard label="Redo" value={summary?.ready || 0} tone="green" />
              <SummaryCard label="Saknar bank" value={summary?.missingBank || 0} tone="red" />
              <SummaryCard label="Nollbelopp" value={summary?.zeroAmount || 0} tone="amber" />
              <SummaryCard label="Prel. utbetalning" valueText={fmtMoney(summary?.totalPayout || 0)} tone="blue" />
            </div>

            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
              <strong>Viktigt:</strong> detta är ett kontrollunderlag. Bankunderlaget använder nettolön/utbetalningsbelopp när det finns sparat. Om nettolön saknas används fortfarande preliminärt belopp från lönebeskedet.
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Utbetalningsunderlag
                  </h2>
                  <p className="text-sm text-slate-500">
                    Visar {filteredTotal} rader
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1380px] w-full border-collapse text-left text-sm">
                  <thead className="bg-[#194C66] text-white">
                    <tr>
                      <Th>Anställd</Th>
                      <Th>Mottagare</Th>
                      <Th>Belopp</Th>
                      <Th>Bank</Th>
                      <Th>Clearing</Th>
                      <Th>Konto</Th>
                      <Th>IBAN</Th>
                      <Th>Status</Th>
                      <Th>Kontroll</Th>
                      <Th>Anteckning</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={10} className="px-5 py-8 text-center text-slate-500">
                          Hämtar bankunderlag...
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-5 py-10 text-center">
                          <div className="mx-auto max-w-lg">
                            <div className="text-base font-bold text-[#194C66]">
                              Inget bankunderlag hittades
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              Välj en lönekörning med lönerader först.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => (
                        <tr key={row.payroll_row_id} className="align-top transition hover:bg-slate-50">
                          <Td>
                            <div className="font-bold text-[#194C66]">
                              {row.employee_name}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {roleLabel(row.employee_role)}
                            </div>
                          </Td>

                          <Td>{row.recipient_name || "—"}</Td>
                          <Td>
                            <strong>{fmtMoney(row.payout_amount)}</strong>
                            <div className="mt-1 text-xs text-slate-500">
                              Brutto: {fmtMoney(row.gross_total)}
                            </div>
                          </Td>
                          <Td>{row.bank_name || "—"}</Td>
                          <Td>{row.clearing_number || "—"}</Td>
                          <Td>{maskAccount(row.account_number)}</Td>
                          <Td>{row.iban ? maskAccount(row.iban) : "—"}</Td>

                          <Td>
                            <span className={"inline-flex rounded-full px-3 py-1 text-xs font-semibold " + statusClass(row.payslip_status)}>
                              {statusLabel(row.payslip_status)}
                            </span>
                          </Td>

                          <Td>
                            {row.can_export ? (
                              <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                Redo
                              </span>
                            ) : row.missing_bank ? (
                              <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                                Saknar bank
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                                Kontrollera
                              </span>
                            )}
                          </Td>

                          <Td>
                            <div className="max-w-[260px] truncate text-slate-600">
                              {row.notes || "—"}
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
