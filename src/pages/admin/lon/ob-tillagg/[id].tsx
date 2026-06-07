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
  work_date: "",
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

function calculateAmount(hours: string, rate: string) {
  return (Number(String(hours).replace(",", ".")) || 0) * (Number(String(rate).replace(",", ".")) || 0);
}

export default function LonObTillaggDetailPage() {
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

      if (key === "hours" || key === "rate") {
        next.amount = calculateAmount(
          key === "hours" ? String(value) : next.hours,
          key === "rate" ? String(value) : next.rate
        ).toFixed(2);
      }

      return next;
    });
  }

  async function loadAllowance() {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/lon/ob-tillagg/" + encodeURIComponent(id));
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta OB/tillägg.");
      }

      const allowance = json.allowance || {};

      setEmployees(json.employees || []);
      setCreatedAt(allowance.created_at || "");
      setUpdatedAt(allowance.updated_at || "");

      setForm({
        employee_id: allowance.employee_id || "",
        allowance_type: allowance.allowance_type || "ob_evening",
        work_date: allowance.work_date ? String(allowance.work_date).slice(0, 10) : "",
        start_time: allowance.start_time || "",
        end_time: allowance.end_time || "",
        hours: allowance.hours !== null && allowance.hours !== undefined ? String(allowance.hours) : "0",
        rate: allowance.rate !== null && allowance.rate !== undefined ? String(allowance.rate) : "0",
        amount: allowance.amount !== null && allowance.amount !== undefined ? String(allowance.amount) : "0",
        affects_payroll: allowance.affects_payroll !== false,
        status: allowance.status || "draft",
        title: allowance.title || "",
        notes: allowance.notes || "",
      });
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function saveAllowance(event: FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/lon/ob-tillagg/" + encodeURIComponent(id), {
        method: "PUT",
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
      await loadAllowance();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara OB/tillägg.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadAllowance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const employee = selectedEmployee();

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="px-6 pb-8 pt-10">
          <form onSubmit={saveAllowance} className="w-full space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00645d]">
                  Lön
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  {loading ? "OB / Tillägg" : employeeName(employee)}
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  {typeLabel(form.allowance_type)} · {statusLabel(form.status)}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/admin/lon/ob-tillagg"
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Tillbaka
                </Link>

                <button
                  type="button"
                  onClick={loadAllowance}
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
                  {saving ? "Sparar..." : "Spara OB/tillägg"}
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
                Laddar OB/tillägg...
              </section>
            ) : (
              <>
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    OB / tilläggsuppgifter
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
