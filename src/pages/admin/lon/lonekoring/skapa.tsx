import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type PreviewRow = {
  employee_id: string;
  employee_name: string;
  employee_role?: string | null;
  pay_type: string;
  hours: number;
  hourly_rate?: number | null;
  monthly_salary?: number | null;
  vacation_percent: number;
  gross_base: number;
  vacation_pay: number;
  gross_total: number;
  employer_fee_percent: number;
  employer_fee: number;
  total_cost: number;
  report_count: number;
  has_rate: boolean;
};

type ApiResponse = {
  ok: boolean;
  needsSetup?: boolean;
  rows?: PreviewRow[];
  summary?: {
    employees: number;
    totalHours: number;
    grossBase: number;
    vacationPay: number;
    grossTotal: number;
    employerFee: number;
    totalCost: number;
    missingRates: number;
  };
  error?: string;
  run?: {
    id: string;
    title: string;
    status: string;
  };
};

function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const payout = new Date(now.getFullYear(), now.getMonth() + 1, 25);

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    payout: payout.toISOString().slice(0, 10),
  };
}

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
    case "missing":
      return "Saknar lön";
    default:
      return type || "Lönetyp";
  }
}

function payTypeClass(type?: string | null) {
  switch (type) {
    case "hourly":
      return "bg-[#eef8fb] text-[#194C66]";
    case "monthly":
      return "bg-purple-100 text-purple-700";
    case "missing":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function SkapaLonekoringPage() {
  const [mounted, setMounted] = useState(false);

  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [payoutDate, setPayoutDate] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [summary, setSummary] = useState<ApiResponse["summary"]>({
    employees: 0,
    totalHours: 0,
    grossBase: 0,
    vacationPay: 0,
    grossTotal: 0,
    employerFee: 0,
    totalCost: 0,
    missingRates: 0,
  });

  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadPreview(startValue = periodStart, endValue = periodEnd) {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      if (!startValue || !endValue) {
        throw new Error("Välj löneperiod först.");
      }

      const params = new URLSearchParams();
      params.set("period_start", startValue);
      params.set("period_end", endValue);

      const res = await fetch("/api/admin/lon/lonekoring/skapa?" + params.toString());
      const json: ApiResponse = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta löneunderlag.");
      }

      setRows(json.rows || []);
      setSummary(json.summary || {
        employees: 0,
        totalHours: 0,
        grossBase: 0,
        vacationPay: 0,
        grossTotal: 0,
        employerFee: 0,
        totalCost: 0,
        missingRates: 0,
      });
      setNeedsSetup(Boolean(json.needsSetup));
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function createPayrollRun() {
    try {
      setCreating(true);
      setError("");
      setMessage("");

      if (!periodStart || !periodEnd) {
        throw new Error("Välj löneperiod först.");
      }

      const res = await fetch("/api/admin/lon/lonekoring/skapa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          period_start: periodStart,
          period_end: periodEnd,
          payout_date: payoutDate,
          title,
          notes,
        }),
      });

      const json: ApiResponse = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte skapa lönekörningen.");
      }

      setMessage("Lönekörningen skapades: " + (json.run?.title || "Utkast"));
      await loadPreview();
    } catch (err: any) {
      setError(err?.message || "Kunde inte skapa lönekörningen.");
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    const defaults = getCurrentMonthRange();

    setMounted(true);
    setPeriodStart(defaults.start);
    setPeriodEnd(defaults.end);
    setPayoutDate(defaults.payout);
    setTitle("Lönekörning " + defaults.start + " - " + defaults.end);

    loadPreview(defaults.start, defaults.end);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canCreate = useMemo(() => {
    return (
      !needsSetup &&
      rows.length > 0 &&
      Number(summary?.missingRates || 0) === 0 &&
      !creating &&
      !loading
    );
  }, [needsSetup, rows.length, summary?.missingRates, creating, loading]);

  if (!mounted) {
    return (
      <>
        <AdminMenu />
        <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
          <Header />
          <main className="px-6 pb-8 pt-10">
            <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
              Laddar lönekörning...
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
                  Skapa lönekörning
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Skapa ett preliminärt löneutkast från godkända tider. Första versionen räknar timmar, grundlön, semesterersättning och arbetsgivaravgift.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => loadPreview()}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3548] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Hämtar..." : "Hämta underlag"}
                </button>

                <button
                  type="button"
                  onClick={createPayrollRun}
                  disabled={!canCreate}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creating ? "Skapar..." : "Skapa lönekörning"}
                </button>
              </div>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-5">
                <Field label="Period från" type="date" value={periodStart} onChange={setPeriodStart} />
                <Field label="Period till" type="date" value={periodEnd} onChange={setPeriodEnd} />
                <Field label="Utbetalningsdatum" type="date" value={payoutDate} onChange={setPayoutDate} />
                <Field label="Titel" value={title} onChange={setTitle} />
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => loadPreview()}
                    disabled={loading}
                    className="w-full rounded-xl bg-[#00645d] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#004f49] disabled:opacity-60"
                  >
                    Räkna om
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Anteckning
                </label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  placeholder="Ex. första lönekörning, kontrollera innan export..."
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                />
              </div>

              {(message || error) && (
                <div
                  className={
                    "mt-4 rounded-xl px-4 py-3 text-sm font-semibold " +
                    (error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700")
                  }
                >
                  {error || message}
                </div>
              )}

              {needsSetup && (
                <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  Tabellerna payroll_runs och payroll_run_rows saknas. Kör SQL-koden för lönekörning innan du skapar löneutkast.
                </div>
              )}

              {Number(summary?.missingRates || 0) > 0 && (
                <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  En eller flera anställda saknar aktiv lönesats. Lägg in timlön/månadslön innan lönekörning.
                </div>
              )}
            </section>

            <div className="grid gap-4 md:grid-cols-6">
              <SummaryCard label="Anställda" value={summary?.employees || 0} />
              <SummaryCard label="Timmar" valueText={fmtNumber(summary?.totalHours || 0)} tone="blue" />
              <SummaryCard label="Grundlön" valueText={fmtMoney(summary?.grossBase || 0)} tone="blue" />
              <SummaryCard label="Semester" valueText={fmtMoney(summary?.vacationPay || 0)} tone="green" />
              <SummaryCard label="Brutto" valueText={fmtMoney(summary?.grossTotal || 0)} tone="green" />
              <SummaryCard label="Total kostnad" valueText={fmtMoney(summary?.totalCost || 0)} tone="amber" />
            </div>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Löneunderlag
                  </h2>
                  <p className="text-sm text-slate-500">
                    Godkända tider i vald period
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1280px] w-full border-collapse text-left text-sm">
                  <thead className="bg-[#194C66] text-white">
                    <tr>
                      <Th>Anställd</Th>
                      <Th>Lönetyp</Th>
                      <Th>Timmar</Th>
                      <Th>Lönesats</Th>
                      <Th>Grundlön</Th>
                      <Th>Semester</Th>
                      <Th>Brutto</Th>
                      <Th>Arbetsgivaravgift</Th>
                      <Th>Total kostnad</Th>
                      <Th>Rapporter</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={10} className="px-5 py-8 text-center text-slate-500">
                          Hämtar löneunderlag...
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-5 py-10 text-center">
                          <div className="mx-auto max-w-lg">
                            <div className="text-base font-bold text-[#194C66]">
                              Inget löneunderlag hittades
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              Det finns inga godkända tidrapporter i vald period. Gå till Godkänn tider och godkänn rapporter först.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => (
                        <tr key={row.employee_id} className="align-top transition hover:bg-slate-50">
                          <Td>
                            <div className="font-bold text-[#194C66]">
                              {row.employee_name}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {roleLabel(row.employee_role)}
                            </div>
                          </Td>

                          <Td>
                            <span className={"inline-flex rounded-full px-3 py-1 text-xs font-semibold " + payTypeClass(row.pay_type)}>
                              {payTypeLabel(row.pay_type)}
                            </span>
                          </Td>

                          <Td>{fmtNumber(row.hours)} h</Td>

                          <Td>
                            {row.pay_type === "hourly"
                              ? fmtMoney(row.hourly_rate) + "/tim"
                              : row.pay_type === "monthly"
                                ? fmtMoney(row.monthly_salary) + "/mån"
                                : "Saknas"}
                          </Td>

                          <Td>{fmtMoney(row.gross_base)}</Td>
                          <Td>{fmtMoney(row.vacation_pay)} ({fmtNumber(row.vacation_percent)} %)</Td>
                          <Td>
                            <strong>{fmtMoney(row.gross_total)}</strong>
                          </Td>
                          <Td>{fmtMoney(row.employer_fee)} ({fmtNumber(row.employer_fee_percent)} %)</Td>
                          <Td>
                            <strong>{fmtMoney(row.total_cost)}</strong>
                          </Td>
                          <Td>{row.report_count} st</Td>
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
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
      />
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
