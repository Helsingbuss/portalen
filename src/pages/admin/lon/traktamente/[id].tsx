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
  trip_start_date: "",
  trip_end_date: "",
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

function calculateAmount(days: string, rate: string) {
  return (Number(String(days).replace(",", ".")) || 0) * (Number(String(rate).replace(",", ".")) || 0);
}

export default function LonTraktamenteDetailPage() {
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

  async function loadPerDiem() {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/lon/traktamente/" + encodeURIComponent(id));
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta traktamente.");
      }

      const perDiem = json.perDiem || {};

      setEmployees(json.employees || []);
      setCreatedAt(perDiem.created_at || "");
      setUpdatedAt(perDiem.updated_at || "");

      setForm({
        employee_id: perDiem.employee_id || "",
        per_diem_type: perDiem.per_diem_type || "domestic_full_day",
        trip_start_date: perDiem.trip_start_date ? String(perDiem.trip_start_date).slice(0, 10) : "",
        trip_end_date: perDiem.trip_end_date ? String(perDiem.trip_end_date).slice(0, 10) : "",
        destination: perDiem.destination || "",
        country: perDiem.country || "Sverige",
        days: perDiem.days !== null && perDiem.days !== undefined ? String(perDiem.days) : "1",
        rate: perDiem.rate !== null && perDiem.rate !== undefined ? String(perDiem.rate) : "300",
        amount: perDiem.amount !== null && perDiem.amount !== undefined ? String(perDiem.amount) : "300",
        tax_free: perDiem.tax_free !== false,
        affects_payroll: perDiem.affects_payroll !== false,
        status: perDiem.status || "draft",
        title: perDiem.title || "",
        notes: perDiem.notes || "",
      });
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function savePerDiem(event: FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/lon/traktamente/" + encodeURIComponent(id), {
        method: "PUT",
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
      await loadPerDiem();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara traktamente.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadPerDiem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const employee = selectedEmployee();

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="px-6 pb-8 pt-10">
          <form onSubmit={savePerDiem} className="w-full space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00645d]">
                  Lön
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  {loading ? "Traktamente" : employeeName(employee)}
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  {typeLabel(form.per_diem_type)} · {statusLabel(form.status)}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/admin/lon/traktamente"
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Tillbaka
                </Link>

                <button
                  type="button"
                  onClick={loadPerDiem}
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
                  {saving ? "Sparar..." : "Spara traktamente"}
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
                Laddar traktamente...
              </section>
            ) : (
              <>
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Traktamenteuppgifter
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
