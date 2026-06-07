import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type EmployeeRow = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
};

type FormState = {
  employee_id: string;
  pay_type: string;
  hourly_rate: string;
  monthly_salary: string;
  standard_hours_per_month: string;
  vacation_pay_percent: string;
  effective_from: string;
  effective_to: string;
  is_active: boolean;
  notes: string;
};

const emptyForm: FormState = {
  employee_id: "",
  pay_type: "hourly",
  hourly_rate: "",
  monthly_salary: "",
  standard_hours_per_month: "174",
  vacation_pay_percent: "12",
  effective_from: new Date().toISOString().slice(0, 10),
  effective_to: "",
  is_active: true,
  notes: "",
};

function employeeName(employee?: EmployeeRow) {
  if (!employee) return "—";
  return [employee.first_name, employee.last_name].filter(Boolean).join(" ") || "Anställd";
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
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function fmtMoney(value?: string | number | null) {
  if (value === "" || value === null || value === undefined) return "—";

  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function LonLonesatsDetailPage() {
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

      if (key === "pay_type") {
        if (value === "hourly") {
          next.monthly_salary = "";
        }

        if (value === "monthly") {
          next.hourly_rate = "";
        }
      }

      return next;
    });
  }

  async function loadRate() {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/lon/lonesatser/" + encodeURIComponent(id));
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta lönesatsen.");
      }

      const rate = json.rate || {};

      setEmployees(json.employees || []);
      setCreatedAt(rate.created_at || "");
      setUpdatedAt(rate.updated_at || "");

      setForm({
        employee_id: rate.employee_id || "",
        pay_type: rate.pay_type || "hourly",
        hourly_rate:
          rate.hourly_rate !== null && rate.hourly_rate !== undefined ? String(rate.hourly_rate) : "",
        monthly_salary:
          rate.monthly_salary !== null && rate.monthly_salary !== undefined ? String(rate.monthly_salary) : "",
        standard_hours_per_month:
          rate.standard_hours_per_month !== null && rate.standard_hours_per_month !== undefined
            ? String(rate.standard_hours_per_month)
            : "174",
        vacation_pay_percent:
          rate.vacation_pay_percent !== null && rate.vacation_pay_percent !== undefined
            ? String(rate.vacation_pay_percent)
            : "12",
        effective_from: rate.effective_from ? String(rate.effective_from).slice(0, 10) : "",
        effective_to: rate.effective_to ? String(rate.effective_to).slice(0, 10) : "",
        is_active: rate.is_active !== false,
        notes: rate.notes || "",
      });
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function saveRate(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/lon/lonesatser/" + encodeURIComponent(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara lönesatsen.");
      }

      setMessage("Lönesatsen sparades.");
      await loadRate();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara lönesatsen.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadRate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const employee = selectedEmployee();

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
                  {loading ? "Lönesats" : employeeName(employee)}
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  {payTypeLabel(form.pay_type)} · {form.pay_type === "hourly" ? fmtMoney(form.hourly_rate) + "/tim" : fmtMoney(form.monthly_salary) + "/mån"}
                  {updatedAt ? " · Uppdaterad " + new Date(updatedAt).toLocaleString("sv-SE") : ""}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/admin/lon/lonesatser"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Tillbaka
                </Link>

                <button
                  type="submit"
                  form="rate-edit-form"
                  disabled={saving || loading}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Sparar..." : "Spara lönesats"}
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

            {loading ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
                Laddar lönesats...
              </section>
            ) : (
              <form id="rate-edit-form" onSubmit={saveRate} className="space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {payTypeLabel(form.pay_type)}
                      </div>

                      <h2 className="mt-2 text-2xl font-bold text-[#194C66]">
                        {employeeName(employee)}
                      </h2>

                      <p className="mt-2 text-sm text-slate-600">
                        {roleLabel(employee?.role)} · Semesterersättning {form.vacation_pay_percent || "0"} %
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className={"inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold " + payTypeClass(form.pay_type)}>
                        {payTypeLabel(form.pay_type)}
                      </span>

                      <span className={"inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold " + (form.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700")}>
                        {form.is_active ? "Aktiv" : "Inaktiv"}
                      </span>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Löneuppgifter
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
                          employeeName(employee) + " · " + roleLabel(employee.role),
                        ] as [string, string]),
                      ]}
                    />

                    <SelectField
                      label="Lönetyp"
                      value={form.pay_type}
                      onChange={(value) => updateField("pay_type", value)}
                      options={[
                        ["hourly", "Timlön"],
                        ["monthly", "Månadslön"],
                      ]}
                    />

                    <Field label="Timlön" value={form.hourly_rate} onChange={(value) => updateField("hourly_rate", value)} />
                    <Field label="Månadslön" value={form.monthly_salary} onChange={(value) => updateField("monthly_salary", value)} />
                    <Field label="Standard timmar/månad" value={form.standard_hours_per_month} onChange={(value) => updateField("standard_hours_per_month", value)} />
                    <Field label="Semesterersättning %" value={form.vacation_pay_percent} onChange={(value) => updateField("vacation_pay_percent", value)} />
                    <Field label="Gäller från" type="date" value={form.effective_from} onChange={(value) => updateField("effective_from", value)} />
                    <Field label="Gäller till" type="date" value={form.effective_to} onChange={(value) => updateField("effective_to", value)} />

                    <SelectField
                      label="Aktiv"
                      value={form.is_active ? "true" : "false"}
                      onChange={(value) => updateField("is_active", value === "true")}
                      options={[
                        ["true", "Ja"],
                        ["false", "Nej"],
                      ]}
                    />
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Anteckning
                  </h2>

                  <textarea
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    rows={8}
                    placeholder="Ex. enligt avtal, ny lön från visst datum, provanställning..."
                    className="mt-5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                  />
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
              </form>
            )}
          </div>
        </main>
      </div>
    </>
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
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
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
