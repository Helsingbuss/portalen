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
  accounting_exported_at?: string | null;
  accounting_export_reference?: string | null;
};

type BookingLine = {
  account: string;
  description: string;
  debit: number;
  credit: number;
  type: string;
};

type ApiResponse = {
  ok: boolean;
  runs?: PayrollRun[];
  selectedRun?: PayrollRun | null;
  lines?: BookingLine[];
  accounts?: any;
  summary?: {
    employees: number;
    grossBase: number;
    vacationPay: number;
    grossTotal: number;
    tax: number;
    net: number;
    employerFee: number;
    totalCost: number;
    totalDebit: number;
    totalCredit: number;
    difference: number;
    balanced: boolean;
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

export default function LonBokforingPage() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [lines, setLines] = useState<BookingLine[]>([]);
  const [summary, setSummary] = useState<ApiResponse["summary"]>({
    employees: 0,
    grossBase: 0,
    vacationPay: 0,
    grossTotal: 0,
    tax: 0,
    net: 0,
    employerFee: 0,
    totalCost: 0,
    totalDebit: 0,
    totalCredit: 0,
    difference: 0,
    balanced: true,
  });

  const [runId, setRunId] = useState("");

  const [wageAccount, setWageAccount] = useState("7010");
  const [vacationAccount, setVacationAccount] = useState("7090");
  const [employerFeeAccount, setEmployerFeeAccount] = useState("7510");
  const [taxLiabilityAccount, setTaxLiabilityAccount] = useState("2710");
  const [employerFeeLiabilityAccount, setEmployerFeeLiabilityAccount] = useState("2731");
  const [netPayLiabilityAccount, setNetPayLiabilityAccount] = useState("2910");

  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function accountParams(nextRunId = runId) {
    const params = new URLSearchParams();

    if (nextRunId) params.set("payroll_run_id", nextRunId);

    params.set("wageAccount", wageAccount);
    params.set("vacationAccount", vacationAccount);
    params.set("employerFeeAccount", employerFeeAccount);
    params.set("taxLiabilityAccount", taxLiabilityAccount);
    params.set("employerFeeLiabilityAccount", employerFeeLiabilityAccount);
    params.set("netPayLiabilityAccount", netPayLiabilityAccount);

    return params;
  }

  async function loadData(nextRunId = runId) {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/lon/bokforing?" + accountParams(nextRunId).toString());
      const json: ApiResponse = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta bokföringsunderlag.");
      }

      setRuns(json.runs || []);
      setSelectedRun(json.selectedRun || null);
      setLines(json.lines || []);
      setSummary(json.summary || summary);

      if (!nextRunId && json.selectedRun?.id) {
        setRunId(json.selectedRun.id);
      }

      if (json.selectedRun) {
        setReference(json.selectedRun.accounting_export_reference || "");
      }
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  function downloadCsv() {
    if (!selectedRun?.id) {
      setError("Välj lönekörning först.");
      return;
    }

    window.location.href =
      "/api/admin/lon/bokforing/" +
      encodeURIComponent(selectedRun.id) +
      "/csv?" +
      accountParams(selectedRun.id).toString();
  }

  async function markExported() {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (!selectedRun?.id) {
        throw new Error("Välj lönekörning först.");
      }

      const res = await fetch("/api/admin/lon/bokforing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payroll_run_id: selectedRun.id,
          accounting_export_reference: reference,
          accounting_export_notes: notes,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte markera export.");
      }

      setMessage("Bokföringsexport markerades som skapad.");
      await loadData(selectedRun.id);
    } catch (err: any) {
      setError(err?.message || "Kunde inte markera export.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadData("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lineTotal = useMemo(() => lines.length, [lines]);

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
                  Bokföringsexport
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Skapa bokföringsunderlag för lön, skatt, arbetsgivaravgift och nettoutbetalning. Kontona är förslag och ska kontrolleras med bokföring/revisor.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => loadData(runId)}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3548] disabled:opacity-60"
                >
                  {loading ? "Hämtar..." : "Uppdatera"}
                </button>

                <button
                  type="button"
                  onClick={downloadCsv}
                  disabled={!selectedRun?.id || lines.length === 0}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:opacity-60"
                >
                  Exportera CSV
                </button>
              </div>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[1fr_180px_180px]">
                <SelectField
                  label="Lönekörning"
                  value={runId}
                  onChange={(value) => {
                    setRunId(value);
                    loadData(value);
                  }}
                  options={[
                    ["", "Välj lönekörning"],
                    ...runs.map((run) => [
                      run.id,
                      (run.title || "Lönekörning") + " · " + fmtDate(run.period_start) + " - " + fmtDate(run.period_end),
                    ] as [string, string]),
                  ]}
                />

                <div className="flex items-end">
                  <a
                    href="/admin/lon/historik"
                    className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#194C66] transition hover:bg-slate-50"
                  >
                    Historik
                  </a>
                </div>

                <div className="flex items-end">
                  <a
                    href="/admin/lon/status"
                    className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#194C66] transition hover:bg-slate-50"
                  >
                    Status
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
                  <div className="mt-1">
                    Bokföring exporterad: {fmtDateTime(selectedRun.accounting_exported_at)}
                  </div>
                </div>
              )}

              {(message || error) && (
                <div className={"mt-4 rounded-xl px-4 py-3 text-sm font-semibold " + (error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700")}>
                  {error || message}
                </div>
              )}
            </section>

            <div className="grid gap-4 md:grid-cols-6">
              <SummaryCard label="Personal" value={summary?.employees || 0} />
              <SummaryCard label="Brutto" valueText={fmtMoney(summary?.grossTotal || 0)} tone="blue" />
              <SummaryCard label="Skatt" valueText={fmtMoney(summary?.tax || 0)} tone="red" />
              <SummaryCard label="Netto" valueText={fmtMoney(summary?.net || 0)} tone="green" />
              <SummaryCard label="Arbg.avg" valueText={fmtMoney(summary?.employerFee || 0)} tone="amber" />
              <SummaryCard label="Balans" valueText={summary?.balanced ? "OK" : fmtMoney(summary?.difference || 0)} tone={summary?.balanced ? "green" : "red"} />
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-[#194C66]">
                Kontoinställningar
              </h2>

              <div className="mt-5 grid gap-4 lg:grid-cols-6">
                <Field label="Löner" value={wageAccount} onChange={setWageAccount} />
                <Field label="Semester" value={vacationAccount} onChange={setVacationAccount} />
                <Field label="Arbg.avg kostnad" value={employerFeeAccount} onChange={setEmployerFeeAccount} />
                <Field label="Skatt skuld" value={taxLiabilityAccount} onChange={setTaxLiabilityAccount} />
                <Field label="Arbg.avg skuld" value={employerFeeLiabilityAccount} onChange={setEmployerFeeLiabilityAccount} />
                <Field label="Nettolön skuld" value={netPayLiabilityAccount} onChange={setNetPayLiabilityAccount} />
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => loadData(runId)}
                  className="rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0f3548]"
                >
                  Räkna om konton
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-[#194C66]">
                Markera som bokföringsexporterad
              </h2>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <Field
                  label="Referens"
                  value={reference}
                  onChange={setReference}
                  placeholder="Ex. Verifikation LÖN-2026-05"
                />

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Anteckning
                  </label>
                  <input
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Ex. Exporterad till bokföringssystem"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={markExported}
                  disabled={saving || !selectedRun?.id}
                  className="rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#004f49] disabled:opacity-60"
                >
                  {saving ? "Sparar..." : "Markera exporterad"}
                </button>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Verifikationsrader
                  </h2>
                  <p className="text-sm text-slate-500">
                    Visar {lineTotal} rader
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1000px] w-full border-collapse text-left text-sm">
                  <thead className="bg-[#194C66] text-white">
                    <tr>
                      <Th>Konto</Th>
                      <Th>Beskrivning</Th>
                      <Th>Debet</Th>
                      <Th>Kredit</Th>
                      <Th>Typ</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                          Laddar bokföring...
                        </td>
                      </tr>
                    ) : lines.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                          Inga verifikationsrader hittades.
                        </td>
                      </tr>
                    ) : (
                      lines.map((line, index) => (
                        <tr key={index} className="align-top transition hover:bg-slate-50">
                          <Td>
                            <strong className="text-[#194C66]">{line.account}</strong>
                          </Td>
                          <Td>{line.description}</Td>
                          <Td>{line.debit ? fmtMoney(line.debit) : "—"}</Td>
                          <Td>{line.credit ? fmtMoney(line.credit) : "—"}</Td>
                          <Td>
                            <span className={"inline-flex rounded-full px-3 py-1 text-xs font-semibold " + (line.type === "debit" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700")}>
                              {line.type === "debit" ? "Debet" : "Kredit"}
                            </span>
                          </Td>
                        </tr>
                      ))
                    )}
                  </tbody>

                  {lines.length > 0 && (
                    <tfoot className="bg-slate-50 font-bold text-slate-800">
                      <tr>
                        <Td>Totalt</Td>
                        <Td>{summary?.balanced ? "Balanserad" : "Differens"}</Td>
                        <Td>{fmtMoney(summary?.totalDebit || 0)}</Td>
                        <Td>{fmtMoney(summary?.totalCredit || 0)}</Td>
                        <Td>{summary?.balanced ? "OK" : fmtMoney(summary?.difference || 0)}</Td>
                      </tr>
                    </tfoot>
                  )}
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
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
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
