import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
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
  payment_status_notes?: string | null;
  created_at?: string | null;
};

type PayrollRow = {
  id: string;
  employee_name_snapshot?: string | null;
  employee_role_snapshot?: string | null;
  hours?: number | null;
  gross_total?: number | null;
  preliminary_tax_amount?: number | null;
  net_pay?: number | null;
  payout_amount?: number | null;
  total_cost?: number | null;
  status?: string | null;
  app_published?: boolean | null;
  email_status?: string | null;
  payslip_pdf_path?: string | null;
  payslip_pdf_url?: string | null;
};

type ApiResponse = {
  ok: boolean;
  needsSetup?: boolean;
  run?: PayrollRun | null;
  rows?: PayrollRow[];
  summary?: {
    rows: number;
    gross: number;
    tax: number;
    net: number;
    employerFee: number;
    totalCost: number;
    published: number;
    emailSent: number;
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

export default function LonHistorikDetailPage() {
  const router = useRouter();
  const id = String(router.query.id || "");

  const [run, setRun] = useState<PayrollRun | null>(null);
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [summary, setSummary] = useState<ApiResponse["summary"]>({
    rows: 0,
    gross: 0,
    tax: 0,
    net: 0,
    employerFee: 0,
    totalCost: 0,
    published: 0,
    emailSent: 0,
  });

  const [archiveNotes, setArchiveNotes] = useState("");
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadDetail() {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/lon/historik/" + encodeURIComponent(id));
      const json: ApiResponse = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta arkivdetalj.");
      }

      setRun(json.run || null);
      setRows(json.rows || []);
      setSummary(json.summary || {
        rows: 0,
        gross: 0,
        tax: 0,
        net: 0,
        employerFee: 0,
        totalCost: 0,
        published: 0,
        emailSent: 0,
      });
      setArchiveNotes(json.run?.archive_notes || "");
      setNeedsSetup(Boolean(json.needsSetup));
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function updateArchive(action: "archive" | "unarchive" | "notes") {
    if (!id) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/lon/historik/" + encodeURIComponent(id), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          archive_notes: archiveNotes,
        }),
      });

      const json: ApiResponse = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte uppdatera arkiv.");
      }

      setMessage(action === "archive" ? "Lönekörningen arkiverades." : action === "unarchive" ? "Lönekörningen togs bort från arkivet." : "Arkivanteckning sparades.");
      setRun(json.run || null);
      setRows(json.rows || []);
      setSummary(json.summary || summary);
      setArchiveNotes(json.run?.archive_notes || "");
    } catch (err: any) {
      setError(err?.message || "Kunde inte uppdatera arkiv.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
                  {run?.title || "Arkiverad lönekörning"}
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Period {fmtDate(run?.period_start)} – {fmtDate(run?.period_end)} · Utbetalning {fmtDate(run?.payout_date)}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/admin/lon/historik"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Tillbaka
                </Link>

                <Link
                  href={"/admin/lon/lonekoring/" + encodeURIComponent(id)}
                  className="inline-flex items-center justify-center rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3548]"
                >
                  Öppna lönekörning
                </Link>

                <button
                  type="button"
                  onClick={loadDetail}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                >
                  {loading ? "Hämtar..." : "Uppdatera"}
                </button>
              </div>
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

            {message && (
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-700 shadow-sm">
                {message}
              </section>
            )}

            <div className="grid gap-4 md:grid-cols-6">
              <SummaryCard label="Rader" value={summary?.rows || 0} />
              <SummaryCard label="Brutto" valueText={fmtMoney(summary?.gross || 0)} tone="blue" />
              <SummaryCard label="Skatt" valueText={fmtMoney(summary?.tax || 0)} tone="red" />
              <SummaryCard label="Netto" valueText={fmtMoney(summary?.net || 0)} tone="green" />
              <SummaryCard label="Total kostnad" valueText={fmtMoney(summary?.totalCost || 0)} tone="amber" />
              <SummaryCard label="Publicerade" value={summary?.published || 0} tone="slate" />
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-3">
                <InfoBox label="Status" value={statusLabel(run?.status)} badgeClass={statusClass(run?.status)} />
                <InfoBox label="Arkiverad" value={run?.archived_at ? fmtDateTime(run.archived_at) : "Ej arkiverad"} />
                <InfoBox label="Bank/exportreferens" value={run?.bank_export_reference || "—"} />
              </div>

              <div className="mt-5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Arkivanteckning
                </label>
                <textarea
                  value={archiveNotes}
                  onChange={(event) => setArchiveNotes(event.target.value)}
                  rows={4}
                  placeholder="Ex. Löneperiod kontrollerad, lönebesked skickade, bankfil signerad och lönen utbetald..."
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                />
              </div>

              <div className="mt-5 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => updateArchive("notes")}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Spara anteckning
                </button>

                {run?.archived_at ? (
                  <button
                    type="button"
                    onClick={() => updateArchive("unarchive")}
                    disabled={saving}
                    className="rounded-xl bg-amber-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
                  >
                    Ta bort från arkiv
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => updateArchive("archive")}
                    disabled={saving}
                    className="rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#004f49] disabled:opacity-60"
                  >
                    Arkivera lönekörning
                  </button>
                )}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Lönebesked i perioden
                  </h2>
                  <p className="text-sm text-slate-500">
                    Visar {rows.length} lönebesked
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1350px] w-full border-collapse text-left text-sm">
                  <thead className="bg-[#194C66] text-white">
                    <tr>
                      <Th>Anställd</Th>
                      <Th>Timmar</Th>
                      <Th>Brutto</Th>
                      <Th>Skatt</Th>
                      <Th>Netto</Th>
                      <Th>Total kostnad</Th>
                      <Th>Status</Th>
                      <Th>App</Th>
                      <Th>E-post</Th>
                      <Th>PDF</Th>
                      <Th>Öppna</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={11} className="px-5 py-8 text-center text-slate-500">
                          Laddar arkivdetalj...
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-5 py-10 text-center text-slate-500">
                          Inga lönebesked hittades.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => (
                        <tr key={row.id} className="align-top transition hover:bg-slate-50">
                          <Td>
                            <div className="font-bold text-[#194C66]">
                              {row.employee_name_snapshot || "Anställd"}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {row.employee_role_snapshot || "Personal"}
                            </div>
                          </Td>

                          <Td>{fmtNumber(row.hours)} h</Td>
                          <Td>{fmtMoney(row.gross_total)}</Td>
                          <Td>{fmtMoney(row.preliminary_tax_amount)}</Td>
                          <Td>
                            <strong>{fmtMoney(row.net_pay || row.payout_amount)}</strong>
                          </Td>
                          <Td>{fmtMoney(row.total_cost)}</Td>
                          <Td>
                            <span className={"inline-flex rounded-full px-3 py-1 text-xs font-semibold " + statusClass(row.status)}>
                              {statusLabel(row.status)}
                            </span>
                          </Td>
                          <Td>{row.app_published ? "Ja" : "Nej"}</Td>
                          <Td>{row.email_status || "—"}</Td>
                          <Td>{row.payslip_pdf_path || row.payslip_pdf_url ? "Finns" : "Saknas"}</Td>
                          <Td>
                            <div className="flex flex-col gap-2">
                              <a
                                href={"/admin/lon/lonebesked/" + encodeURIComponent(row.id)}
                                className="inline-flex w-fit rounded-lg bg-[#194C66] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0f3548]"
                              >
                                Lönebesked
                              </a>

                              <a
                                href={"/api/admin/lon/lonebesked/" + encodeURIComponent(row.id) + "/pdf"}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex w-fit rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#194C66] hover:bg-slate-50"
                              >
                                PDF
                              </a>
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

function InfoBox({
  label,
  value,
  badgeClass,
}: {
  label: string;
  value: string;
  badgeClass?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      {badgeClass ? (
        <span className={"mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold " + badgeClass}>
          {value}
        </span>
      ) : (
        <div className="mt-1 font-semibold text-slate-800">{value}</div>
      )}
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="whitespace-nowrap px-5 py-4 text-xs font-bold uppercase tracking-wide">{children}</th>;
}

function Td({ children }: { children: ReactNode }) {
  return <td className="px-5 py-4">{children}</td>;
}
