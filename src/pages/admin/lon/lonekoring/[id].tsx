import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type RunState = {
  title: string;
  period_start: string;
  period_end: string;
  payout_date: string;
  status: string;
  notes: string;
};

type RowState = {
  id: string;
  employee_name_snapshot?: string | null;
  employee_role_snapshot?: string | null;
  pay_type: string;
  hours: string;
  hourly_rate: string;
  monthly_salary: string;
  vacation_percent: string;
  gross_base: string;
  vacation_pay: string;
  gross_total: string;
  employer_fee_percent: string;
  employer_fee: string;
  total_cost: string;
  status: string;
  notes: string;
};

const emptyRun: RunState = {
  title: "",
  period_start: "",
  period_end: "",
  payout_date: "",
  status: "draft",
  notes: "",
};

function fmtMoney(value?: string | number | null) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function fmtNumber(value?: string | number | null) {
  return new Intl.NumberFormat("sv-SE", {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function statusLabel(status?: string | null) {
  switch (status) {
    case "draft":
      return "Utkast";
    case "approved":
      return "Godkänd";
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

function toText(value: any) {
  return value === null || value === undefined ? "" : String(value);
}

function toDateText(value: any) {
  return value ? String(value).slice(0, 10) : "";
}

export default function LonLonekoringDetailPage() {
  const router = useRouter();
  const id = String(router.query.id || "");

  const [run, setRun] = useState<RunState>(emptyRun);
  const [rows, setRows] = useState<RowState[]>([]);
  const [createdAt, setCreatedAt] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function updateRunField<K extends keyof RunState>(key: K, value: RunState[K]) {
    setRun((prev) => ({ ...prev, [key]: value }));
  }

  function updateRowField(id: string, key: keyof RowState, value: string) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;

        const next = { ...row, [key]: value };

        if (
          key === "hours" ||
          key === "hourly_rate" ||
          key === "monthly_salary" ||
          key === "vacation_percent" ||
          key === "employer_fee_percent" ||
          key === "pay_type"
        ) {
          const hours = Number(String(next.hours || "0").replace(",", "."));
          const hourlyRate = Number(String(next.hourly_rate || "0").replace(",", "."));
          const monthlySalary = Number(String(next.monthly_salary || "0").replace(",", "."));
          const vacationPercent = Number(String(next.vacation_percent || "0").replace(",", "."));
          const employerPercent = Number(String(next.employer_fee_percent || "0").replace(",", "."));

          const grossBase =
            next.pay_type === "monthly"
              ? monthlySalary
              : hours * hourlyRate;

          const vacationPay = grossBase * vacationPercent / 100;
          const grossTotal = grossBase + vacationPay;
          const employerFee = grossTotal * employerPercent / 100;
          const totalCost = grossTotal + employerFee;

          next.gross_base = grossBase.toFixed(2);
          next.vacation_pay = vacationPay.toFixed(2);
          next.gross_total = grossTotal.toFixed(2);
          next.employer_fee = employerFee.toFixed(2);
          next.total_cost = totalCost.toFixed(2);
        }

        return next;
      })
    );
  }

  async function loadRun() {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/lon/lonekoring/" + encodeURIComponent(id));
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta lönekörningen.");
      }

      const item = json.run || {};

      setCreatedAt(item.created_at || "");
      setUpdatedAt(item.updated_at || "");

      setRun({
        title: item.title || "",
        period_start: toDateText(item.period_start),
        period_end: toDateText(item.period_end),
        payout_date: toDateText(item.payout_date),
        status: item.status || "draft",
        notes: item.notes || "",
      });

      setRows(
        (json.rows || []).map((row: any) => ({
          id: row.id,
          employee_name_snapshot: row.employee_name_snapshot || "",
          employee_role_snapshot: row.employee_role_snapshot || "",
          pay_type: row.pay_type || "hourly",
          hours: toText(row.hours),
          hourly_rate: toText(row.hourly_rate),
          monthly_salary: toText(row.monthly_salary),
          vacation_percent: toText(row.vacation_percent),
          gross_base: toText(row.gross_base),
          vacation_pay: toText(row.vacation_pay),
          gross_total: toText(row.gross_total),
          employer_fee_percent: toText(row.employer_fee_percent),
          employer_fee: toText(row.employer_fee),
          total_cost: toText(row.total_cost),
          status: row.status || "draft",
          notes: row.notes || "",
        }))
      );
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function saveRun(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/lon/lonekoring/" + encodeURIComponent(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          run,
          rows,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara lönekörningen.");
      }

      setMessage("Lönekörningen sparades.");
      await loadRun();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara lönekörningen.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadRun();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const summary = useMemo(() => {
    return {
      employees: rows.length,
      hours: rows.reduce((sum, row) => sum + Number(String(row.hours || "0").replace(",", ".")), 0),
      gross: rows.reduce((sum, row) => sum + Number(String(row.gross_total || "0").replace(",", ".")), 0),
      employerFee: rows.reduce((sum, row) => sum + Number(String(row.employer_fee || "0").replace(",", ".")), 0),
      totalCost: rows.reduce((sum, row) => sum + Number(String(row.total_cost || "0").replace(",", ".")), 0),
    };
  }, [rows]);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="px-6 pb-8 pt-10">
          <form onSubmit={saveRun} className="w-full space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00645d]">
                  Lön
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  {loading ? "Lönekörning" : run.title || "Lönekörning"}
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  {run.period_start} – {run.period_end}
                  {updatedAt ? " · Uppdaterad " + new Date(updatedAt).toLocaleString("sv-SE") : ""}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/admin/lon/lonekoring"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Tillbaka
                </Link>

                <button
                  type="button"
                  onClick={loadRun}
                  className="inline-flex items-center justify-center rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3548]"
                >
                  Uppdatera
                </button>

                <button
                  type="submit"
                  disabled={saving || loading}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Sparar..." : "Spara lönekörning"}
                </button>
              </div>
            </div>

            {error && (
              <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
                {error}
              </section>
            )}

            {message && (
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-700">
                {message}
              </section>
            )}

            <div className="grid gap-4 md:grid-cols-5">
              <SummaryCard label="Anställda" value={summary.employees} />
              <SummaryCard label="Timmar" valueText={fmtNumber(summary.hours)} tone="blue" />
              <SummaryCard label="Brutto" valueText={fmtMoney(summary.gross)} tone="green" />
              <SummaryCard label="Arbetsgivaravgift" valueText={fmtMoney(summary.employerFee)} tone="blue" />
              <SummaryCard label="Total kostnad" valueText={fmtMoney(summary.totalCost)} tone="amber" />
            </div>

            {loading ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
                Laddar lönekörning...
              </section>
            ) : (
              <>
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-[#194C66]">
                        Lönekörningens uppgifter
                      </h2>
                      <p className="mt-2 text-sm text-slate-500">
                        Ändra status, period, utbetalningsdatum och anteckning.
                      </p>
                    </div>

                    <span className={"inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold " + statusClass(run.status)}>
                      {statusLabel(run.status)}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-4">
                    <Field label="Titel" value={run.title} onChange={(value) => updateRunField("title", value)} />
                    <Field label="Period från" type="date" value={run.period_start} onChange={(value) => updateRunField("period_start", value)} />
                    <Field label="Period till" type="date" value={run.period_end} onChange={(value) => updateRunField("period_end", value)} />
                    <Field label="Utbetalningsdatum" type="date" value={run.payout_date} onChange={(value) => updateRunField("payout_date", value)} />

                    <SelectField
                      label="Status"
                      value={run.status}
                      onChange={(value) => updateRunField("status", value)}
                      options={[
                        ["draft", "Utkast"],
                        ["approved", "Godkänd"],
                        ["exported", "Exporterad"],
                        ["paid", "Betald"],
                        ["cancelled", "Avbruten"],
                      ]}
                    />
                  </div>

                  <div className="mt-4">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Anteckning
                    </label>
                    <textarea
                      value={run.notes}
                      onChange={(event) => updateRunField("notes", event.target.value)}
                      rows={4}
                      className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                    />
                  </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 px-5 py-4">
                    <h2 className="text-lg font-bold text-[#194C66]">
                      Lönerader
                    </h2>
                    <p className="text-sm text-slate-500">
                      Ändra rader om något behöver korrigeras innan lönebesked/export.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-[1500px] w-full border-collapse text-left text-sm">
                      <thead className="bg-[#194C66] text-white">
                        <tr>
                          <Th>Anställd</Th>
                          <Th>Lönetyp</Th>
                          <Th>Timmar</Th>
                          <Th>Timlön</Th>
                          <Th>Månadslön</Th>
                          <Th>Semester %</Th>
                          <Th>Grundlön</Th>
                          <Th>Semester</Th>
                          <Th>Brutto</Th>
                          <Th>AG %</Th>
                          <Th>AG kr</Th>
                          <Th>Total kostnad</Th>
                          <Th>Status</Th>
                          <Th>Anteckning</Th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {rows.length === 0 ? (
                          <tr>
                            <td colSpan={14} className="px-5 py-10 text-center text-slate-500">
                              Inga lönerader finns på denna lönekörning.
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
                                  {roleLabel(row.employee_role_snapshot)}
                                </div>
                              </Td>

                              <Td>
                                <SelectSmall
                                  value={row.pay_type}
                                  onChange={(value) => updateRowField(row.id, "pay_type", value)}
                                  options={[
                                    ["hourly", "Timlön"],
                                    ["monthly", "Månadslön"],
                                  ]}
                                />
                              </Td>

                              <Td><InputSmall value={row.hours} onChange={(value) => updateRowField(row.id, "hours", value)} /></Td>
                              <Td><InputSmall value={row.hourly_rate} onChange={(value) => updateRowField(row.id, "hourly_rate", value)} /></Td>
                              <Td><InputSmall value={row.monthly_salary} onChange={(value) => updateRowField(row.id, "monthly_salary", value)} /></Td>
                              <Td><InputSmall value={row.vacation_percent} onChange={(value) => updateRowField(row.id, "vacation_percent", value)} /></Td>
                              <Td><InputSmall value={row.gross_base} onChange={(value) => updateRowField(row.id, "gross_base", value)} /></Td>
                              <Td><InputSmall value={row.vacation_pay} onChange={(value) => updateRowField(row.id, "vacation_pay", value)} /></Td>
                              <Td><InputSmall value={row.gross_total} onChange={(value) => updateRowField(row.id, "gross_total", value)} /></Td>
                              <Td><InputSmall value={row.employer_fee_percent} onChange={(value) => updateRowField(row.id, "employer_fee_percent", value)} /></Td>
                              <Td><InputSmall value={row.employer_fee} onChange={(value) => updateRowField(row.id, "employer_fee", value)} /></Td>
                              <Td><InputSmall value={row.total_cost} onChange={(value) => updateRowField(row.id, "total_cost", value)} /></Td>

                              <Td>
                                <SelectSmall
                                  value={row.status}
                                  onChange={(value) => updateRowField(row.id, "status", value)}
                                  options={[
                                    ["draft", "Utkast"],
                                    ["approved", "Godkänd"],
                                    ["exported", "Exporterad"],
                                    ["paid", "Betald"],
                                  ]}
                                />
                              </Td>

                              <Td>
                                <input
                                  value={row.notes}
                                  onChange={(event) => updateRowField(row.id, "notes", event.target.value)}
                                  className="w-[220px] rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#194C66]"
                                />
                              </Td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Systeminformation
                  </h2>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <InfoLine label="Skapad" value={createdAt ? new Date(createdAt).toLocaleString("sv-SE") : "—"} />
                    <InfoLine label="Senast uppdaterad" value={updatedAt ? new Date(updatedAt).toLocaleString("sv-SE") : "—"} />
                  </div>
                </section>
              </>
            )}
          </form>
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

function InputSmall({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-[110px] rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#194C66]"
    />
  );
}

function SelectSmall({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-[130px] rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#194C66]"
    >
      {options.map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
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

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 font-semibold text-slate-800">{value}</div>
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
