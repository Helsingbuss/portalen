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

type BonusRow = {
  id: string;
  employee_id?: string | null;
  bonus_type?: string | null;
  earning_date?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  basis_amount?: number | null;
  rate_percent?: number | null;
  quantity?: number | null;
  unit_rate?: number | null;
  amount?: number | null;
  affects_payroll?: boolean | null;
  status?: string | null;
  title?: string | null;
  notes?: string | null;
};

type FormState = {
  employee_id: string;
  bonus_type: string;
  earning_date: string;
  period_start: string;
  period_end: string;
  basis_amount: string;
  rate_percent: string;
  quantity: string;
  unit_rate: string;
  amount: string;
  affects_payroll: boolean;
  status: string;
  title: string;
  notes: string;
};

const today = new Date().toISOString().slice(0, 10);

const emptyForm: FormState = {
  employee_id: "",
  bonus_type: "bonus",
  earning_date: today,
  period_start: today,
  period_end: today,
  basis_amount: "0",
  rate_percent: "0",
  quantity: "0",
  unit_rate: "0",
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
    case "bonus": return "Bonus";
    case "commission_percent": return "Provision %";
    case "commission_per_booking": return "Provision/bokning";
    case "one_time": return "Engångsersättning";
    case "manual": return "Manuell";
    default: return type || "Bonus/provision";
  }
}

function typeClass(type?: string | null) {
  switch (type) {
    case "bonus": return "bg-emerald-100 text-emerald-700";
    case "commission_percent": return "bg-blue-100 text-blue-700";
    case "commission_per_booking": return "bg-purple-100 text-purple-700";
    case "one_time": return "bg-amber-100 text-amber-700";
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

function toNumber(value: string) {
  return Number(String(value || "0").replace(",", ".")) || 0;
}

function calculateAmount(form: FormState) {
  if (form.bonus_type === "commission_percent") {
    return toNumber(form.basis_amount) * toNumber(form.rate_percent) / 100;
  }

  if (form.bonus_type === "commission_per_booking") {
    return toNumber(form.quantity) * toNumber(form.unit_rate);
  }

  return toNumber(form.amount);
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

export default function LonBonusProvisionPage() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [bonuses, setBonuses] = useState<BonusRow[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    draft: 0,
    submitted: 0,
    approved: 0,
    rejected: 0,
    payrollRelevant: 0,
    bonus: 0,
    commissionPercent: 0,
    commissionBooking: 0,
    oneTime: 0,
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

      if (
        key === "bonus_type" ||
        key === "basis_amount" ||
        key === "rate_percent" ||
        key === "quantity" ||
        key === "unit_rate"
      ) {
        const calculated = calculateAmount(next);

        if (next.bonus_type === "commission_percent" || next.bonus_type === "commission_per_booking") {
          next.amount = calculated.toFixed(2);
        }
      }

      return next;
    });
  }

  async function loadBonuses() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      if (type) params.set("type", type);
      if (employeeId) params.set("employee_id", employeeId);

      const res = await fetch("/api/admin/lon/bonus-provision?" + params.toString());
      const json = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta bonus/provision.");
      }

      setEmployees(json.employees || []);
      setBonuses(json.bonuses || []);
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

  async function createBonus(event: FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/lon/bonus-provision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara bonus/provision.");
      }

      setMessage("Bonus/provision sparades.");
      setForm((prev) => ({
        ...emptyForm,
        employee_id: prev.employee_id,
      }));
      setShowForm(false);
      await loadBonuses();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara bonus/provision.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadBonuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = useMemo(() => bonuses.length, [bonuses]);

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
                  Bonus / provision
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Registrera bonus, provision och engångsersättningar som senare kan följa med in i lönekörning.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm((value) => !value)}
                  className="rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49]"
                >
                  {showForm ? "Stäng formulär" : "Ny bonus/provision"}
                </button>

                <button
                  type="button"
                  onClick={loadBonuses}
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
              <SummaryCard label="Bonus" value={summary.bonus} tone="green" />
              <SummaryCard label="Provision %" value={summary.commissionPercent} tone="blue" />
              <SummaryCard label="Provision/bokning" value={summary.commissionBooking} tone="amber" />
              <SummaryCard label="Belopp" valueText={fmtMoney(summary.totalAmount)} tone="green" />
            </div>

            {needsSetup && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
                Tabellen <strong>payroll_bonus_commissions</strong> saknas. Kör SQL-koden nedan först.
              </section>
            )}

            {(message || error) && (
              <section className={"rounded-2xl border p-5 text-sm font-semibold shadow-sm " + (error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>
                {error || message}
              </section>
            )}

            {showForm && (
              <form onSubmit={createBonus} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-[#194C66]">
                  Ny bonus/provision
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
                    value={form.bonus_type}
                    onChange={(value) => updateField("bonus_type", value)}
                    options={[
                      ["bonus", "Bonus"],
                      ["commission_percent", "Provision %"],
                      ["commission_per_booking", "Provision/bokning"],
                      ["one_time", "Engångsersättning"],
                      ["manual", "Manuell"],
                    ]}
                  />

                  <Field label="Datum" type="date" value={form.earning_date} onChange={(value) => updateField("earning_date", value)} />
                  <Field label="Period start" type="date" value={form.period_start} onChange={(value) => updateField("period_start", value)} />
                  <Field label="Period slut" type="date" value={form.period_end} onChange={(value) => updateField("period_end", value)} />
                  <Field label="Underlag kr" value={form.basis_amount} onChange={(value) => updateField("basis_amount", value)} />
                  <Field label="Provision %" value={form.rate_percent} onChange={(value) => updateField("rate_percent", value)} />
                  <Field label="Antal" value={form.quantity} onChange={(value) => updateField("quantity", value)} />
                  <Field label="Belopp/st" value={form.unit_rate} onChange={(value) => updateField("unit_rate", value)} />
                  <Field label="Totalt belopp" value={form.amount} onChange={(value) => updateField("amount", value)} />

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
                    {saving ? "Sparar..." : "Spara bonus/provision"}
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
                  placeholder="Sök namn, titel, anteckning..."
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
                    ["bonus", "Bonus"],
                    ["commission_percent", "Provision %"],
                    ["commission_per_booking", "Provision/bokning"],
                    ["one_time", "Engångsersättning"],
                    ["manual", "Manuell"],
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
                    onClick={loadBonuses}
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
                  Bonus- och provisionslista
                </h2>
                <p className="text-sm text-slate-500">
                  Visar {total} poster
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1450px] w-full border-collapse text-left text-sm">
                  <thead className="bg-[#194C66] text-white">
                    <tr>
                      <Th>Anställd</Th>
                      <Th>Typ</Th>
                      <Th>Datum</Th>
                      <Th>Period</Th>
                      <Th>Underlag</Th>
                      <Th>Provision %</Th>
                      <Th>Antal</Th>
                      <Th>Belopp/st</Th>
                      <Th>Totalt</Th>
                      <Th>Lönepåverkan</Th>
                      <Th>Status</Th>
                      <Th>Titel</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={12} className="px-5 py-8 text-center text-slate-500">
                          Laddar bonus/provision...
                        </td>
                      </tr>
                    ) : bonuses.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="px-5 py-10 text-center text-slate-500">
                          Ingen bonus/provision hittades.
                        </td>
                      </tr>
                    ) : (
                      bonuses.map((bonus) => {
                        const employee = getEmployee(bonus.employee_id);

                        return (
                          <tr
                            key={bonus.id}
                            onClick={() => {
                              window.location.href = "/admin/lon/bonus-provision/" + encodeURIComponent(bonus.id);
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
                              <span className={"inline-flex rounded-full px-3 py-1 text-xs font-semibold " + typeClass(bonus.bonus_type)}>
                                {typeLabel(bonus.bonus_type)}
                              </span>
                            </Td>

                            <Td>{fmtDate(bonus.earning_date)}</Td>
                            <Td>{fmtDate(bonus.period_start)} – {fmtDate(bonus.period_end)}</Td>
                            <Td>{fmtMoney(bonus.basis_amount)}</Td>
                            <Td>{fmtNumber(bonus.rate_percent)} %</Td>
                            <Td>{fmtNumber(bonus.quantity)}</Td>
                            <Td>{fmtMoney(bonus.unit_rate)}</Td>
                            <Td>
                              <strong>{fmtMoney(bonus.amount)}</strong>
                            </Td>
                            <Td>{bonus.affects_payroll ? "Ja" : "Nej"}</Td>
                            <Td>
                              <span className={"inline-flex rounded-full px-3 py-1 text-xs font-semibold " + statusClass(bonus.status)}>
                                {statusLabel(bonus.status)}
                              </span>
                            </Td>
                            <Td>
                              <div className="max-w-[260px] truncate text-slate-600">
                                {bonus.title || bonus.notes || "—"}
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
