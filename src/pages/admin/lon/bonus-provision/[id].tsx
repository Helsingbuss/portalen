import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type EmployeeRow = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  role?: string | null;
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

const emptyForm: FormState = {
  employee_id: "",
  bonus_type: "bonus",
  earning_date: "",
  period_start: "",
  period_end: "",
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

function statusLabel(status?: string | null) {
  switch (status) {
    case "draft": return "Utkast";
    case "submitted": return "Inskickad";
    case "approved": return "Godkänd";
    case "rejected": return "Avslagen";
    default: return status || "Status";
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

export default function LonBonusProvisionDetailPage() {
  const router = useRouter();
  const id = String(router.query.id || "");

  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [createdAt, setCreatedAt] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function selectedEmployee() {
    return employees.find((employee) => employee.id === form.employee_id);
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

  async function loadBonus() {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/lon/bonus-provision/" + encodeURIComponent(id));
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta bonus/provision.");
      }

      const bonus = json.bonus || {};

      setEmployees(json.employees || []);
      setCreatedAt(bonus.created_at || "");
      setUpdatedAt(bonus.updated_at || "");

      setForm({
        employee_id: bonus.employee_id || "",
        bonus_type: bonus.bonus_type || "bonus",
        earning_date: bonus.earning_date ? String(bonus.earning_date).slice(0, 10) : "",
        period_start: bonus.period_start ? String(bonus.period_start).slice(0, 10) : "",
        period_end: bonus.period_end ? String(bonus.period_end).slice(0, 10) : "",
        basis_amount: bonus.basis_amount !== null && bonus.basis_amount !== undefined ? String(bonus.basis_amount) : "0",
        rate_percent: bonus.rate_percent !== null && bonus.rate_percent !== undefined ? String(bonus.rate_percent) : "0",
        quantity: bonus.quantity !== null && bonus.quantity !== undefined ? String(bonus.quantity) : "0",
        unit_rate: bonus.unit_rate !== null && bonus.unit_rate !== undefined ? String(bonus.unit_rate) : "0",
        amount: bonus.amount !== null && bonus.amount !== undefined ? String(bonus.amount) : "0",
        affects_payroll: bonus.affects_payroll !== false,
        status: bonus.status || "draft",
        title: bonus.title || "",
        notes: bonus.notes || "",
      });
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function saveBonus(event: FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/lon/bonus-provision/" + encodeURIComponent(id), {
        method: "PUT",
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
      await loadBonus();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara bonus/provision.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadBonus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const employee = selectedEmployee();

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="px-6 pb-8 pt-10">
          <form onSubmit={saveBonus} className="w-full space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00645d]">
                  Lön
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  {loading ? "Bonus / provision" : employeeName(employee)}
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  {typeLabel(form.bonus_type)} · {statusLabel(form.status)}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/admin/lon/bonus-provision"
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Tillbaka
                </Link>

                <button
                  type="button"
                  onClick={loadBonus}
                  disabled={loading}
                  className="rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3548] disabled:opacity-60"
                >
                  Uppdatera
                </button>

                <button
                  type="submit"
                  disabled={saving || loading}
                  className="rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:opacity-60"
                >
                  {saving ? "Sparar..." : "Spara bonus/provision"}
                </button>
              </div>
            </div>

            {(message || error) && (
              <section className={"rounded-2xl border p-5 text-sm font-semibold shadow-sm " + (error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>
                {error || message}
              </section>
            )}

            {loading ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
                Laddar bonus/provision...
              </section>
            ) : (
              <>
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Bonus / provision
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
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Anteckning
                  </h2>

                  <textarea
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    rows={6}
                    className="mt-5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                  />
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Systeminformation
                  </h2>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <InfoLine label="Skapad" value={fmtDateTime(createdAt)} />
                    <InfoLine label="Senast uppdaterad" value={fmtDateTime(updatedAt)} />
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
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
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

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 font-semibold text-slate-800">{value}</div>
    </div>
  );
}
