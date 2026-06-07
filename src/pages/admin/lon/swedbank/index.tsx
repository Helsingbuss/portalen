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
  swedbank_exported_at?: string | null;
  swedbank_export_reference?: string | null;
};

type BankRow = {
  id: string;
  employee_name_snapshot?: string | null;
  recipient_name_final?: string | null;
  bank_name?: string | null;
  clearing_number?: string | null;
  account_number?: string | null;
  iban?: string | null;
  payout_amount_final?: number | null;
  can_export?: boolean | null;
  missing_account?: boolean | null;
  missing_name?: boolean | null;
  zero_amount?: boolean | null;
};

type ApiResponse = {
  ok: boolean;
  runs?: PayrollRun[];
  selectedRun?: PayrollRun | null;
  rows?: BankRow[];
  summary?: {
    rows: number;
    ready: number;
    missingAccount: number;
    missingName: number;
    zeroAmount: number;
    totalAmount: number;
  };
  settingsWarnings?: {
    missingDebtorName: boolean;
    missingDebtorAccount: boolean;
    missingOrgNumber: boolean;
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

function canCreateSwedbankFileFromStatus(status?: string | null) {
  return status === "approved";
}

function maskAccount(value?: string | null) {
  const text = String(value || "").replace(/\s/g, "");
  if (!text) return "—";
  if (text.length <= 4) return "****";
  return "**** " + text.slice(-4);
}

export default function LonSwedbankPage() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [rows, setRows] = useState<BankRow[]>([]);
  const [summary, setSummary] = useState<ApiResponse["summary"]>({
    rows: 0,
    ready: 0,
    missingAccount: 0,
    missingName: 0,
    zeroAmount: 0,
    totalAmount: 0,
  });
  const [settingsWarnings, setSettingsWarnings] = useState<ApiResponse["settingsWarnings"]>({
    missingDebtorName: false,
    missingDebtorAccount: false,
    missingOrgNumber: false,
  });

  const [runId, setRunId] = useState("");

  const [debtorName, setDebtorName] = useState("Helsingbuss");
  const [debtorOrgNumber, setDebtorOrgNumber] = useState("");
  const [debtorIban, setDebtorIban] = useState("");
  const [debtorAccount, setDebtorAccount] = useState("");
  const [messagePrefix, setMessagePrefix] = useState("HELSINGBUSS");

  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function params(nextRunId = runId) {
    const p = new URLSearchParams();

    if (nextRunId) p.set("payroll_run_id", nextRunId);

    p.set("debtorName", debtorName);
    p.set("debtorOrgNumber", debtorOrgNumber);
    p.set("debtorIban", debtorIban);
    p.set("debtorAccount", debtorAccount);
    p.set("messagePrefix", messagePrefix);

    return p;
  }

  async function loadData(nextRunId = runId) {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/lon/swedbank?" + params(nextRunId).toString());
      const json: ApiResponse = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta Swedbank-underlag.");
      }

      setRuns(json.runs || []);
      setSelectedRun(json.selectedRun || null);
      setRows(json.rows || []);
      setSummary(json.summary || {
        rows: 0,
        ready: 0,
        missingAccount: 0,
        missingName: 0,
        zeroAmount: 0,
        totalAmount: 0,
      });
      setSettingsWarnings(json.settingsWarnings || {
        missingDebtorName: false,
        missingDebtorAccount: false,
        missingOrgNumber: false,
      });

      if (!nextRunId && json.selectedRun?.id) {
        setRunId(json.selectedRun.id);
      }

      if (json.selectedRun) {
        setReference(json.selectedRun.swedbank_export_reference || "");
      }
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  function downloadXml() {
    if (!selectedRun?.id) {
      setError("Välj lönekörning först.");
      return;
    }

    window.location.href =
      "/api/admin/lon/swedbank/" +
      encodeURIComponent(selectedRun.id) +
      "/xml?" +
      params(selectedRun.id).toString();
  }

  async function markExported() {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (!selectedRun?.id) {
        throw new Error("Välj lönekörning först.");
      }

      const res = await fetch("/api/admin/lon/swedbank", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payroll_run_id: selectedRun.id,
          swedbank_export_reference: reference,
          swedbank_export_notes: notes,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte markera Swedbank-export.");
      }

      setMessage("Swedbank-export markerades som skapad.");
      await loadData(selectedRun.id);
    } catch (err: any) {
      setError(err?.message || "Kunde inte markera Swedbank-export.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadData("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rowTotal = useMemo(() => rows.length, [rows]);
  const canDownload =
    Boolean(selectedRun?.id) &&
    canCreateSwedbankFileFromStatus(selectedRun?.status) &&
    Boolean(debtorName.trim()) &&
    Boolean(debtorIban.trim() || debtorAccount.trim()) &&
    (summary?.rows || 0) > 0 &&
    summary?.ready === summary?.rows;

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
                  Swedbank / ISO 20022
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Skapa en XML-bankfil för löneutbetalning. Filen ska valideras/testas hos Swedbank innan den används skarpt.
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
                  onClick={downloadXml}
                  disabled={!canDownload}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Skapa XML-bankfil
                </button>
              </div>
            </div>

            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
              <strong>Viktigt:</strong> detta är en första ISO 20022/pain.001-version för test. Swedbank MIG och bankens validering styr exakt vilka fält som krävs för ert avtal, kanal och betaltyp. Testa filen innan skarp användning.
            </section>

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
                    href="/admin/lon/bankfil"
                    className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#194C66] transition hover:bg-slate-50"
                  >
                    Bankunderlag
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

              {selectedRun && !canCreateSwedbankFileFromStatus(selectedRun.status) && (
                <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  Bankfil kan bara skapas när lönekörningen är Godkänd.
                </div>
              )}

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
                    Swedbank-export: {fmtDateTime(selectedRun.swedbank_exported_at)}
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
              <SummaryCard label="Rader" value={summary?.rows || 0} />
              <SummaryCard label="Redo" value={summary?.ready || 0} tone="green" />
              <SummaryCard label="Saknar konto" value={summary?.missingAccount || 0} tone="red" />
              <SummaryCard label="Saknar namn" value={summary?.missingName || 0} tone="amber" />
              <SummaryCard label="Nollbelopp" value={summary?.zeroAmount || 0} tone="amber" />
              <SummaryCard label="Utbetalning" valueText={fmtMoney(summary?.totalAmount || 0)} tone="green" />
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-[#194C66]">
                Avsändare / företagskonto
              </h2>

              <div className="mt-5 grid gap-4 lg:grid-cols-5">
                <Field label="Företagsnamn" value={debtorName} onChange={setDebtorName} />
                <Field label="Organisationsnummer" value={debtorOrgNumber} onChange={setDebtorOrgNumber} placeholder="Endast siffror" />
                <Field label="Avsändar-IBAN" value={debtorIban} onChange={setDebtorIban} placeholder="SE..." />
                <Field label="Avsändarkonto" value={debtorAccount} onChange={setDebtorAccount} placeholder="Om IBAN saknas" />
                <Field label="Meddelande-prefix" value={messagePrefix} onChange={setMessagePrefix} />
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => loadData(runId)}
                  className="rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0f3548]"
                >
                  Kontrollera fil
                </button>
              </div>

              {(settingsWarnings?.missingDebtorAccount || settingsWarnings?.missingOrgNumber) && (
                <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  {settingsWarnings?.missingDebtorAccount ? "Avsändarkonto/IBAN saknas. " : ""}
                  {settingsWarnings?.missingOrgNumber ? "Organisationsnummer saknas. " : ""}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-[#194C66]">
                Markera som Swedbank-exporterad
              </h2>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <Field
                  label="Referens"
                  value={reference}
                  onChange={setReference}
                  placeholder="Ex. Swedbank XML lön 2026-05"
                />

                <Field
                  label="Anteckning"
                  value={notes}
                  onChange={setNotes}
                  placeholder="Ex. XML skapad och uppladdad för validering"
                />
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
                    Betalningsrader
                  </h2>
                  <p className="text-sm text-slate-500">
                    Visar {rowTotal} rader
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1280px] w-full border-collapse text-left text-sm">
                  <thead className="bg-[#194C66] text-white">
                    <tr>
                      <Th>Anställd</Th>
                      <Th>Mottagare</Th>
                      <Th>Belopp</Th>
                      <Th>Bank</Th>
                      <Th>Clearing</Th>
                      <Th>Konto</Th>
                      <Th>IBAN</Th>
                      <Th>Kontroll</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-8 text-center text-slate-500">
                          Laddar Swedbank-underlag...
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-10 text-center text-slate-500">
                          Inga betalningsrader hittades.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => (
                        <tr key={row.id} className="align-top transition hover:bg-slate-50">
                          <Td>
                            <div className="font-bold text-[#194C66]">
                              {row.employee_name_snapshot || "Anställd"}
                            </div>
                          </Td>
                          <Td>{row.recipient_name_final || "—"}</Td>
                          <Td>
                            <strong>{fmtMoney(row.payout_amount_final)}</strong>
                          </Td>
                          <Td>{row.bank_name || "—"}</Td>
                          <Td>{row.clearing_number || "—"}</Td>
                          <Td>{maskAccount(row.account_number)}</Td>
                          <Td>{row.iban ? maskAccount(row.iban) : "—"}</Td>
                          <Td>
                            {row.can_export ? (
                              <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                Redo
                              </span>
                            ) : (
                              <div className="flex flex-col gap-1">
                                {row.missing_account && <span className="text-xs font-semibold text-red-700">Saknar konto</span>}
                                {row.missing_name && <span className="text-xs font-semibold text-red-700">Saknar namn</span>}
                                {row.zero_amount && <span className="text-xs font-semibold text-amber-700">Nollbelopp</span>}
                              </div>
                            )}
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
