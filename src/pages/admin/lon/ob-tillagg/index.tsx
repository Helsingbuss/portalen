import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type EmployeeRow = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  role?: string | null;
};

type AllowanceRow = {
  id: string;
  employee_id?: string | null;
  allowance_type?: string | null;
  work_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  hours?: number | null;
  rate?: number | null;
  amount?: number | null;
  affects_payroll?: boolean | null;
  status?: string | null;
  title?: string | null;
  notes?: string | null;
};

type FormState = {
  employee_id: string;
  allowance_type: string;
  work_date: string;
  start_time: string;
  end_time: string;
  hours: string;
  rate: string;
  amount: string;
  affects_payroll: boolean;
  status: string;
  title: string;
  notes: string;
};

const emptyForm: FormState = {
  employee_id: "",
  allowance_type: "ob_evening",
  work_date: new Date().toISOString().slice(0, 10),
  start_time: "",
  end_time: "",
  hours: "0",
  rate: "0",
  amount: "0",
  affects_payroll: true,
  status: "draft",
  title: "",
  notes: "",
};

function employeeName(employee?: EmployeeRow) {
  if (!employee) return "—";
  return [employee.first_name, employee.last_name].filter(Boolean).join(" ") || "Anställd";
}

function typeLabel(type?: string | null) {
  switch (type) {
    case "ob_evening": return "OB kväll";
    case "ob_night": return "OB natt";
    case "ob_weekend": return "OB helg";
    case "ob_holiday": return "OB röd dag";
    case "extra_allowance": return "Extra tillägg";
    case "manual": return "Manuellt tillägg";
    default: return type || "OB/Tillägg";
  }
}

function typeClass(type?: string | null) {
  switch (type) {
    case "ob_evening": return "bg-blue-100 text-blue-700";
    case "ob_night": return "bg-indigo-100 text-indigo-700";
    case "ob_weekend": return "bg-purple-100 text-purple-700";
    case "ob_holiday": return "bg-red-100 text-red-700";
    case "extra_allowance": return "bg-emerald-100 text-emerald-700";
    default: return "bg-slate-100 text-slate-700";
  }
}

function statusLabel(status?: string | null) {
  switch (status) {
    case "draft": return "Utkast";
    case "submitted": return "Inskickad";
    case "approved": return "Godkänd";
    case "rejected": return "Avslagen";
    default: return status || "Status";
  }
}

function statusClass(status?: string | null) {
  switch (status) {
    case "approved": return "bg-emerald-100 text-emerald-700";
    case "submitted": return "bg-blue-100 text-blue-700";
    case "rejected": return "bg-red-100 text-red-700";
    case "draft": return "bg-amber-100 text-amber-700";
    default: return "bg-slate-100 text-slate-700";
  }
}

function fmtMoney(value?: number | string | null) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function fmtNumber(value?: number | string | null) {
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

function calculateAmount(hours: string, rate: string) {
  return (Number(String(hours).replace(",", ".")) || 0) * (Number(String(rate).replace(",", ".")) || 0);
}

export default function LonObTillaggPage() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [allowances, setAllowances] = useState<AllowanceRow[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    draft: 0,
    submitted: 0,
    approved: 0,
    rejected: 0,
    payrollRelevant: 0,
    evening: 0,
    night: 0,
    weekend: 0,
    totalHours: 0,
    totalAmount: 0,
  });

  const [form, setForm] = useState<FormState>(emptyForm);
  const [showForm, setShowForm] = useState(false);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [employeeId, setEmployeeId] = useState("");

  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function getEmployee(id?: string | null) {
    return employees.find((employee) => employee.id === id);
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };

      if (key === "hours" || key === "rate") {
        next.amount = calculateAmount(
          key === "hours" ? String(value) : next.hours,
          key === "rate" ? String(value) : next.rate
        ).toFixed(2);
      }

      return next;
    });
  }

  async function loadAllowances() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      if (type) params.set("type", type);
      if (employeeId) params.set("employee_id", employeeId);

      const res = await fetch("/api/admin/lon/ob-tillagg?" + params.toString());
      const json = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta OB/tillägg.");
      }

      setEmployees(json.employees || []);
      setAllowances(json.allowances || []);
      setSummary(json.summary || summary);
      setNeedsSetup(Boolean(json.needsSetup));

      if (!form.employee_id && json.employees?.length) {
        setForm((prev) => ({ ...prev, employee_id: json.employees[0].id }));
      }
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function createAllowance(event: FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/lon/ob-tillagg", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara OB/tillägg.");
      }

      setMessage("OB/tillägg sparades.");
      setForm((prev) => ({
        ...emptyForm,
        employee_id: prev.employee_id,
      }));
      setShowForm(false);
      await loadAllowances();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara OB/tillägg.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadAllowances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = useMemo(() => allowances.length, [allowances]);

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
                  OB / Tillägg
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Registrera OB, helgtillägg, nattillägg och extra ersättningar som senare kan följa med in i lönekörning.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm((value) => !value)}
                  className="rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49]"
                >
                  {showForm ? "Stäng formulär" : "Nytt OB/tillägg"}
                </button>

                <button
                  type="button"
                  onClick={loadAllowances}
                  disabled={loading}
                  className="rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3548] disabled:opacity-60"
                >
                  {loading ? "Hämtar..." : "Uppdatera"}
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-6">
              <SummaryCard label="Totalt" value={summary.total} />
              <SummaryCard label="Godkända" value={summary.approved} tone="green" />
              <SummaryCard label="Kväll" value={summary.evening} tone="blue" />
              <SummaryCard label="Natt" value={summary.night} tone="slate" />
              <SummaryCard label="Timmar" valueText={fmtNumber(summary.totalHours) + " h"} tone="amber" />
              <SummaryCard label="Belopp" valueText={fmtMoney(summary.totalAmount)} tone="green" />
            </div>

            {needsSetup && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
                Tabellen <strong>payroll_ob_allowances</strong> saknas. Kör SQL-koden nedan först.
              </section>
            )}

            {(message || error) && (
              <section className={"rounded-2xl border p-5 text-sm font-semibold shadow-sm " + (error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>
                {error || message}
              </section>
            )}

            {showForm && (
              <form onSubmit={createAllowance} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-[#194C66]">
                  Nytt OB/tillägg
                </h2>

                <div className="mt-5 grid gap-4 lg:grid-cols-4">
                  <SelectField
                    label="Anställd"
                    value={form.employee_id}
                    onChange={(value) => updateField("employee_id", value)}
                    options={[
                      ["", "Välj anställd"],
                      ...employees.map((employee) => [
                        employee.id,
                        employeeName(employee),
                      ] as [string, string]),
                    ]}
                  />

                  <SelectField
                    label="Typ"
                    value={form.allowance_type}
                    onChange={(value) => updateField("allowance_type", value)}
                    options={[
                      ["ob_evening", "OB kväll"],
                      ["ob_night", "OB natt"],
                      ["ob_weekend", "OB helg"],
                      ["ob_holiday", "OB röd dag"],
                      ["extra_allowance", "Extra tillägg"],
                      ["manual", "Manuellt tillägg"],
                    ]}
                  />

                  <Field label="Datum" type="date" value={form.work_date} onChange={(value) => updateField("work_date", value)} />
                  <Field label="Starttid" type="time" value={form.start_time} onChange={(value) => updateField("start_time", value)} />
                  <Field label="Sluttid" type="time" value={form.end_time} onChange={(value) => updateField("end_time", value)} />
                  <Field label="Timmar" value={form.hours} onChange={(value) => updateField("hours", value)} />
                  <Field label="Ersättning/timme" value={form.rate} onChange={(value) => updateField("rate", value)} />
                  <Field label="Belopp" value={form.amount} onChange={(value) => updateField("amount", value)} />

                  <SelectField
                    label="Påverkar lön"
                    value={form.affects_payroll ? "true" : "false"}
                    onChange={(value) => updateField("affects_payroll", value === "true")}
                    options={[
                      ["true", "Ja"],
                      ["false", "Nej"],
                    ]}
                  />

                  <SelectField
                    label="Status"
                    value={form.status}
                    onChange={(value) => updateField("status", value)}
                    options={[
                      ["draft", "Utkast"],
                      ["submitted", "Inskickad"],
                      ["approved", "Godkänd"],
                      ["rejected", "Avslagen"],
                    ]}
                  />

                  <Field label="Titel" value={form.title} onChange={(value) => updateField("title", value)} />
                </div>

                <textarea
                  value={form.notes}
                  onChange={(event) => updateField("notes", event.target.value)}
                  rows={4}
                  placeholder="Anteckning..."
                  className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                />

                <div className="mt-5 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] transition hover:bg-slate-50"
                  >
                    Avbryt
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#004f49] disabled:opacity-60"
                  >
                    {saving ? "Sparar..." : "Spara OB/tillägg"}
                  </button>
                </div>
              </form>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[1fr_180px_180px_220px_140px]">
                <Field
                  label="Sök"
                  value={q}
                  onChange={setQ}
                  placeholder="Sök namn, typ, titel..."
                />

                <SelectField
                  label="Status"
                  value={status}
                  onChange={setStatus}
                  options={[
                    ["", "Alla"],
                    ["draft", "Utkast"],
                    ["submitted", "Inskickad"],
                    ["approved", "Godkänd"],
                    ["rejected", "Avslagen"],
                  ]}
                />

                <SelectField
                  label="Typ"
                  value={type}
                  onChange={setType}
                  options={[
                    ["", "Alla"],
                    ["ob_evening", "OB kväll"],
                    ["ob_night", "OB natt"],
                    ["ob_weekend", "OB helg"],
                    ["ob_holiday", "OB röd dag"],
                    ["extra_allowance", "Extra tillägg"],
                    ["manual", "Manuellt"],
                  ]}
                />

                <SelectField
                  label="Anställd"
                  value={employeeId}
                  onChange={setEmployeeId}
                  options={[
                    ["", "Alla"],
                    ...employees.map((employee) => [
                      employee.id,
                      employeeName(employee),
                    ] as [string, string]),
                  ]}
                />

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={loadAllowances}
                    className="w-full rounded-xl bg-[#00645d] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#004f49]"
                  >
                    Filtrera
                  </button>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-lg font-bold text-[#194C66]">
                  OB- och tilläggslista
                </h2>
                <p className="text-sm text-slate-500">
                  Visar {total} poster
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1320px] w-full border-collapse text-left text-sm">
                  <thead className="bg-[#194C66] text-white">
                    <tr>
                      <Th>Anställd</Th>
                      <Th>Typ</Th>
                      <Th>Datum</Th>
                      <Th>Tid</Th>
                      <Th>Timmar</Th>
                      <Th>Á-pris</Th>
                      <Th>Belopp</Th>
                      <Th>Lönepåverkan</Th>
                      <Th>Status</Th>
                      <Th>Titel</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={10} className="px-5 py-8 text-center text-slate-500">
                          Laddar OB/tillägg...
                        </td>
                      </tr>
                    ) : allowances.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-5 py-10 text-center text-slate-500">
                          Inga OB/tillägg hittades.
                        </td>
                      </tr>
                    ) : (
                      allowances.map((allowance) => {
                        const employee = getEmployee(allowance.employee_id);

                        return (
                          <tr
                            key={allowance.id}
                            onClick={() => {
                              window.location.href = "/admin/lon/ob-tillagg/" + encodeURIComponent(allowance.id);
                            }}
                            className="cursor-pointer align-top transition hover:bg-slate-50"
                          >
                            <Td>
                              <div className="font-bold text-[#194C66]">
                                {employeeName(employee)}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {employee?.email || "—"}
                              </div>
                            </Td>

                            <Td>
                              <span className={"inline-flex rounded-full px-3 py-1 text-xs font-semibold " + typeClass(allowance.allowance_type)}>
                                {typeLabel(allowance.allowance_type)}
                              </span>
                            </Td>

                            <Td>{fmtDate(allowance.work_date)}</Td>
                            <Td>{allowance.start_time || "—"} – {allowance.end_time || "—"}</Td>
                            <Td>{fmtNumber(allowance.hours)} h</Td>
                            <Td>{fmtMoney(allowance.rate)}</Td>
                            <Td>
                              <strong>{fmtMoney(allowance.amount)}</strong>
                            </Td>
                            <Td>{allowance.affects_payroll ? "Ja" : "Nej"}</Td>

                            <Td>
                              <span className={"inline-flex rounded-full px-3 py-1 text-xs font-semibold " + statusClass(allowance.status)}>
                                {statusLabel(allowance.status)}
                              </span>
                            </Td>

                            <Td>
                              <div className="max-w-[260px] truncate text-slate-600">
                                {allowance.title || allowance.notes || "—"}
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

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <input
        type={type}
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
