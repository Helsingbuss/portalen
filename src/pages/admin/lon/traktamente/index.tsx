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

type PerDiemRow = {
  id: string;
  employee_id?: string | null;
  per_diem_type?: string | null;
  trip_start_date?: string | null;
  trip_end_date?: string | null;
  destination?: string | null;
  country?: string | null;
  days?: number | null;
  rate?: number | null;
  amount?: number | null;
  tax_free?: boolean | null;
  affects_payroll?: boolean | null;
  status?: string | null;
  title?: string | null;
  notes?: string | null;
};

type FormState = {
  employee_id: string;
  per_diem_type: string;
  trip_start_date: string;
  trip_end_date: string;
  destination: string;
  country: string;
  days: string;
  rate: string;
  amount: string;
  tax_free: boolean;
  affects_payroll: boolean;
  status: string;
  title: string;
  notes: string;
};

const emptyForm: FormState = {
  employee_id: "",
  per_diem_type: "domestic_full_day",
  trip_start_date: new Date().toISOString().slice(0, 10),
  trip_end_date: new Date().toISOString().slice(0, 10),
  destination: "",
  country: "Sverige",
  days: "1",
  rate: "300",
  amount: "300",
  tax_free: true,
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
    case "domestic_full_day": return "Heldag Sverige";
    case "domestic_half_day": return "Halvdag Sverige";
    case "domestic_night": return "Natt";
    case "domestic_after_three_months": return "Efter 3 månader";
    case "domestic_after_two_years": return "Efter 2 år";
    case "foreign": return "Utland";
    case "manual": return "Manuellt";
    default: return type || "Traktamente";
  }
}

function typeClass(type?: string | null) {
  switch (type) {
    case "domestic_full_day": return "bg-emerald-100 text-emerald-700";
    case "domestic_half_day": return "bg-blue-100 text-blue-700";
    case "domestic_night": return "bg-indigo-100 text-indigo-700";
    case "foreign": return "bg-purple-100 text-purple-700";
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

function calculateAmount(days: string, rate: string) {
  return (Number(String(days).replace(",", ".")) || 0) * (Number(String(rate).replace(",", ".")) || 0);
}

export default function LonTraktamentePage() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [perDiems, setPerDiems] = useState<PerDiemRow[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    draft: 0,
    submitted: 0,
    approved: 0,
    rejected: 0,
    payrollRelevant: 0,
    taxFree: 0,
    fullDay: 0,
    halfDay: 0,
    night: 0,
    totalDays: 0,
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

      if (key === "days" || key === "rate") {
        next.amount = calculateAmount(
          key === "days" ? String(value) : next.days,
          key === "rate" ? String(value) : next.rate
        ).toFixed(2);
      }

      if (key === "per_diem_type") {
        const rates: Record<string, string> = {
          domestic_full_day: "300",
          domestic_half_day: "150",
          domestic_night: "150",
          domestic_after_three_months: "210",
          domestic_after_two_years: "150",
          foreign: "0",
          manual: next.rate,
        };

        next.rate = rates[String(value)] || next.rate;
        next.amount = calculateAmount(next.days, next.rate).toFixed(2);
      }

      return next;
    });
  }

  async function loadPerDiems() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      if (type) params.set("type", type);
      if (employeeId) params.set("employee_id", employeeId);

      const res = await fetch("/api/admin/lon/traktamente?" + params.toString());
      const json = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta traktamente.");
      }

      setEmployees(json.employees || []);
      setPerDiems(json.perDiems || []);
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

  async function createPerDiem(event: FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/lon/traktamente", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara traktamente.");
      }

      setMessage("Traktamente sparades.");
      setForm((prev) => ({
        ...emptyForm,
        employee_id: prev.employee_id,
      }));
      setShowForm(false);
      await loadPerDiems();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara traktamente.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadPerDiems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = useMemo(() => perDiems.length, [perDiems]);

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
                  Traktamente
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Registrera traktamente för heldag, halvdag, natt, längre uppdrag och utlandsresor.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm((value) => !value)}
                  className="rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49]"
                >
                  {showForm ? "Stäng formulär" : "Nytt traktamente"}
                </button>

                <button
                  type="button"
                  onClick={loadPerDiems}
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
              <SummaryCard label="Skattefria" value={summary.taxFree} tone="blue" />
              <SummaryCard label="Heldag" value={summary.fullDay} tone="green" />
              <SummaryCard label="Dagar" valueText={fmtNumber(summary.totalDays)} tone="amber" />
              <SummaryCard label="Belopp" valueText={fmtMoney(summary.totalAmount)} tone="green" />
            </div>

            {needsSetup && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
                Tabellen <strong>payroll_per_diems</strong> saknas. Kör SQL-koden nedan först.
              </section>
            )}

            {(message || error) && (
              <section className={"rounded-2xl border p-5 text-sm font-semibold shadow-sm " + (error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>
                {error || message}
              </section>
            )}

            {showForm && (
              <form onSubmit={createPerDiem} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-[#194C66]">
                  Nytt traktamente
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
                    value={form.per_diem_type}
                    onChange={(value) => updateField("per_diem_type", value)}
                    options={[
                      ["domestic_full_day", "Heldag Sverige"],
                      ["domestic_half_day", "Halvdag Sverige"],
                      ["domestic_night", "Natt"],
                      ["domestic_after_three_months", "Efter 3 månader"],
                      ["domestic_after_two_years", "Efter 2 år"],
                      ["foreign", "Utland"],
                      ["manual", "Manuellt"],
                    ]}
                  />

                  <Field label="Startdatum" type="date" value={form.trip_start_date} onChange={(value) => updateField("trip_start_date", value)} />
                  <Field label="Slutdatum" type="date" value={form.trip_end_date} onChange={(value) => updateField("trip_end_date", value)} />
                  <Field label="Destination" value={form.destination} onChange={(value) => updateField("destination", value)} />
                  <Field label="Land" value={form.country} onChange={(value) => updateField("country", value)} />
                  <Field label="Dagar" value={form.days} onChange={(value) => updateField("days", value)} />
                  <Field label="Belopp/dag" value={form.rate} onChange={(value) => updateField("rate", value)} />
                  <Field label="Totalt belopp" value={form.amount} onChange={(value) => updateField("amount", value)} />

                  <SelectField
                    label="Skattefritt"
                    value={form.tax_free ? "true" : "false"}
                    onChange={(value) => updateField("tax_free", value === "true")}
                    options={[
                      ["true", "Ja"],
                      ["false", "Nej"],
                    ]}
                  />

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
                    {saving ? "Sparar..." : "Spara traktamente"}
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
                  placeholder="Sök namn, destination, land..."
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
                    ["domestic_full_day", "Heldag Sverige"],
                    ["domestic_half_day", "Halvdag Sverige"],
                    ["domestic_night", "Natt"],
                    ["domestic_after_three_months", "Efter 3 månader"],
                    ["domestic_after_two_years", "Efter 2 år"],
                    ["foreign", "Utland"],
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
                    onClick={loadPerDiems}
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
                  Traktamenten
                </h2>
                <p className="text-sm text-slate-500">
                  Visar {total} poster
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1420px] w-full border-collapse text-left text-sm">
                  <thead className="bg-[#194C66] text-white">
                    <tr>
                      <Th>Anställd</Th>
                      <Th>Typ</Th>
                      <Th>Period</Th>
                      <Th>Destination</Th>
                      <Th>Dagar</Th>
                      <Th>Belopp/dag</Th>
                      <Th>Totalt</Th>
                      <Th>Skattefritt</Th>
                      <Th>Lönepåverkan</Th>
                      <Th>Status</Th>
                      <Th>Titel</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={11} className="px-5 py-8 text-center text-slate-500">
                          Laddar traktamenten...
                        </td>
                      </tr>
                    ) : perDiems.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-5 py-10 text-center text-slate-500">
                          Inga traktamenten hittades.
                        </td>
                      </tr>
                    ) : (
                      perDiems.map((perDiem) => {
                        const employee = getEmployee(perDiem.employee_id);

                        return (
                          <tr
                            key={perDiem.id}
                            onClick={() => {
                              window.location.href = "/admin/lon/traktamente/" + encodeURIComponent(perDiem.id);
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
                              <span className={"inline-flex rounded-full px-3 py-1 text-xs font-semibold " + typeClass(perDiem.per_diem_type)}>
                                {typeLabel(perDiem.per_diem_type)}
                              </span>
                            </Td>

                            <Td>{fmtDate(perDiem.trip_start_date)} – {fmtDate(perDiem.trip_end_date)}</Td>
                            <Td>{perDiem.destination || "—"} {perDiem.country ? "· " + perDiem.country : ""}</Td>
                            <Td>{fmtNumber(perDiem.days)}</Td>
                            <Td>{fmtMoney(perDiem.rate)}</Td>
                            <Td>
                              <strong>{fmtMoney(perDiem.amount)}</strong>
                            </Td>
                            <Td>{perDiem.tax_free ? "Ja" : "Nej"}</Td>
                            <Td>{perDiem.affects_payroll ? "Ja" : "Nej"}</Td>

                            <Td>
                              <span className={"inline-flex rounded-full px-3 py-1 text-xs font-semibold " + statusClass(perDiem.status)}>
                                {statusLabel(perDiem.status)}
                              </span>
                            </Td>

                            <Td>
                              <div className="max-w-[260px] truncate text-slate-600">
                                {perDiem.title || perDiem.notes || "—"}
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
