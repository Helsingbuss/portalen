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

  approved_at?: string | null;
  exported_at?: string | null;
  bank_sent_at?: string | null;
  paid_at?: string | null;
  cancelled_at?: string | null;

  bank_export_reference?: string | null;
  payment_status_notes?: string | null;
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

function actionLabel(action: string) {
  switch (action) {
    case "approve":
      return "Godkänd";
    case "export":
      return "Exporterad";
    case "bank_sent":
      return "Skickad till bank";
    case "paid":
      return "Betald";
    case "cancel":
      return "Avbruten";
    case "draft":
      return "Tillbaka till utkast";
    default:
      return action;
  }
}

export default function LonStatusPage() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [summary, setSummary] = useState<ApiResponse["summary"]>({
    total: 0,
    draft: 0,
    approved: 0,
    exported: 0,
    bankSent: 0,
    paid: 0,
    cancelled: 0,
    totalPayout: 0,
  });

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [selectedRunId, setSelectedRunId] = useState("");
  const [action, setAction] = useState("export");
  const [bankExportReference, setBankExportReference] = useState("");
  const [paymentStatusNotes, setPaymentStatusNotes] = useState("");
  const [updateRows, setUpdateRows] = useState(true);

  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedRun = useMemo(
    () => runs.find((run) => run.id === selectedRunId) || null,
    [runs, selectedRunId]
  );

  async function loadRuns() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);

      const res = await fetch("/api/admin/lon/status?" + params.toString());
      const json: ApiResponse = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta status.");
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
        totalPayout: 0,
      });
      setNeedsSetup(Boolean(json.needsSetup));

      if (!selectedRunId && json.runs && json.runs.length > 0) {
        setSelectedRunId(json.runs[0].id);
      }
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus() {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (!selectedRunId) {
        throw new Error("Välj en lönekörning först.");
      }

      const res = await fetch("/api/admin/lon/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payroll_run_id: selectedRunId,
          action,
          bank_export_reference: bankExportReference,
          payment_status_notes: paymentStatusNotes,
          update_rows: updateRows,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte uppdatera status.");
      }

      setMessage("Status uppdaterades till: " + actionLabel(action));
      await loadRuns();
    } catch (err: any) {
      setError(err?.message || "Kunde inte uppdatera status.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadRuns();
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
                  Exportstatus / betalstatus
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Följ lönekörningen från utkast till exporterad, skickad till bank och betald.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href="/admin/lon/bankfil"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Bankunderlag
                </a>

                <button
                  type="button"
                  onClick={loadRuns}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3548] disabled:opacity-60"
                >
                  {loading ? "Hämtar..." : "Uppdatera"}
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-7">
              <SummaryCard label="Totalt" value={summary?.total || 0} />
              <SummaryCard label="Utkast" value={summary?.draft || 0} tone="amber" />
              <SummaryCard label="Godkända" value={summary?.approved || 0} tone="blue" />
              <SummaryCard label="Exporterade" value={summary?.exported || 0} tone="slate" />
              <SummaryCard label="Till bank" value={summary?.bankSent || 0} tone="blue" />
              <SummaryCard label="Betalda" value={summary?.paid || 0} tone="green" />
              <SummaryCard label="Utbetalning" valueText={fmtMoney(summary?.totalPayout || 0)} tone="green" />
            </div>

            {needsSetup && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800 shadow-sm">
                Statuskolumnerna saknas på <strong>payroll_runs</strong>. Kör SQL-koden nedan först.
              </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[1fr_220px_140px]">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Sök
                  </label>
                  <input
                    value={q}
                    onChange={(event) => setQ(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") loadRuns();
                    }}
                    placeholder="Sök titel, period, status, referens..."
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                  />
                </div>

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

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={loadRuns}
                    className="w-full rounded-xl bg-[#00645d] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#004f49]"
                  >
                    Filtrera
                  </button>
                </div>
              </div>

              {(message || error) && (
                <div className={"mt-4 rounded-xl px-4 py-3 text-sm font-semibold " + (error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700")}>
                  {error || message}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-[#194C66]">
                  Uppdatera status
                </h2>
                <p className="text-sm text-slate-500">
                  Välj lönekörning och markera var i flödet den befinner sig.
                </p>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-4">
                <SelectField
                  label="Lönekörning"
                  value={selectedRunId}
                  onChange={setSelectedRunId}
                  options={[
                    ["", "Välj lönekörning"],
                    ...runs.map((run) => [
                      run.id,
                      (run.title || "Lönekörning") + " · " + fmtDate(run.period_start) + " - " + fmtDate(run.period_end),
                    ] as [string, string]),
                  ]}
                />

                <SelectField
                  label="Ny status"
                  value={action}
                  onChange={setAction}
                  options={[
                    ["approve", "Godkänd"],
                    ["export", "Exporterad"],
                    ["bank_sent", "Skickad till bank"],
                    ["paid", "Betald"],
                    ["cancel", "Avbruten"],
                    ["draft", "Tillbaka till utkast"],
                  ]}
                />

                <Field
                  label="Bank/exportreferens"
                  value={bankExportReference}
                  onChange={setBankExportReference}
                  placeholder="Ex. Swedbank fil 2026-05"
                />

                <SelectField
                  label="Uppdatera rader"
                  value={updateRows ? "true" : "false"}
                  onChange={(value) => setUpdateRows(value === "true")}
                  options={[
                    ["true", "Ja"],
                    ["false", "Nej"],
                  ]}
                />
              </div>

              <div className="mt-4">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Statusanteckning
                </label>
                <textarea
                  value={paymentStatusNotes}
                  onChange={(event) => setPaymentStatusNotes(event.target.value)}
                  rows={4}
                  placeholder="Ex. Kontrollerad, exporterad som CSV, uppladdad i Swedbank, signerad och betald..."
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                />
              </div>

              {selectedRun && (
                <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  <strong className="text-[#194C66]">{selectedRun.title}</strong>
                  <div className="mt-1">
                    Nuvarande status: {statusLabel(selectedRun.status)}
                    {" · "}
                    Utbetalning: {fmtMoney(selectedRun.total_payout_amount || selectedRun.total_net_pay || selectedRun.total_gross || 0)}
                  </div>
                </div>
              )}

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={updateStatus}
                  disabled={saving || !selectedRunId}
                  className="rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Sparar..." : "Spara status"}
                </button>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Lönekörningar
                  </h2>
                  <p className="text-sm text-slate-500">
                    Visar {filteredTotal} lönekörningar
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1600px] w-full border-collapse text-left text-sm">
                  <thead className="bg-[#194C66] text-white">
                    <tr>
                      <Th>Lönekörning</Th>
                      <Th>Öppna</Th>
                      <Th>Period</Th>
                      <Th>Utbetalning</Th>
                      <Th>Status</Th>
                      <Th>Nettolön</Th>
                      <Th>Utbetalas</Th>
                      <Th>Godkänd</Th>
                      <Th>Exporterad</Th>
                      <Th>Skickad bank</Th>
                      <Th>Betald</Th>
                      <Th>Referens</Th>
                      <Th>Anteckning</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={13} className="px-5 py-8 text-center text-slate-500">
                          Laddar status...
                        </td>
                      </tr>
                    ) : runs.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="px-5 py-10 text-center text-slate-500">
                          Inga lönekörningar hittades.
                        </td>
                      </tr>
                    ) : (
                      runs.map((run) => (
                        <tr
                          key={run.id}
                          onClick={() => {
                            setSelectedRunId(run.id);
                            setBankExportReference(run.bank_export_reference || "");
                            setPaymentStatusNotes(run.payment_status_notes || "");
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

                          <Td>
                            <div className="flex flex-col gap-2">
                              <a
                                href={"/admin/lon/lonekoring/" + encodeURIComponent(run.id)}
                                onClick={(event) => event.stopPropagation()}
                                className="inline-flex w-fit rounded-lg bg-[#194C66] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0f3548]"
                              >
                                Öppna lönekörning
                              </a>

                              <a
                                href={"/admin/lon/lonebesked?payroll_run_id=" + encodeURIComponent(run.id)}
                                onClick={(event) => event.stopPropagation()}
                                className="inline-flex w-fit rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#194C66] hover:bg-slate-50"
                              >
                                Lönebesked
                              </a>

                              <a
                                href={"/admin/lon/bankfil?payroll_run_id=" + encodeURIComponent(run.id)}
                                onClick={(event) => event.stopPropagation()}
                                className="inline-flex w-fit rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#194C66] hover:bg-slate-50"
                              >
                                Bankunderlag
                              </a>
                            </div>
                          </Td>

                          <Td>{fmtDate(run.period_start)} – {fmtDate(run.period_end)}</Td>
                          <Td>{fmtDate(run.payout_date)}</Td>

                          <Td>
                            <span className={"inline-flex rounded-full px-3 py-1 text-xs font-semibold " + statusClass(run.status)}>
                              {statusLabel(run.status)}
                            </span>
                          </Td>

                          <Td>{fmtMoney(run.total_net_pay)}</Td>
                          <Td>
                            <strong>{fmtMoney(run.total_payout_amount || run.total_net_pay || run.total_gross)}</strong>
                          </Td>

                          <Td>{fmtDateTime(run.approved_at)}</Td>
                          <Td>{fmtDateTime(run.exported_at)}</Td>
                          <Td>{fmtDateTime(run.bank_sent_at)}</Td>
                          <Td>{fmtDateTime(run.paid_at)}</Td>

                          <Td>
                            <div className="max-w-[220px] truncate text-slate-600">
                              {run.bank_export_reference || "—"}
                            </div>
                          </Td>

                          <Td>
                            <div className="max-w-[260px] truncate text-slate-600">
                              {run.payment_status_notes || "—"}
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
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
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
