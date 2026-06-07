import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type EmployeeRow = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  employment_type?: string | null;
  status?: string | null;
};

type RateRow = {
  id: string;
  employee_id?: string | null;
  pay_type?: string | null;
  hourly_rate?: number | null;
  monthly_salary?: number | null;
  standard_hours_per_month?: number | null;
  vacation_pay_percent?: number | null;
  effective_from?: string | null;
  effective_to?: string | null;
  is_active?: boolean | null;
  notes?: string | null;
  created_at?: string | null;
};

type ApiResponse = {
  ok: boolean;
  needsSetup?: boolean;
  employees?: EmployeeRow[];
  rates?: RateRow[];
  summary?: {
    total: number;
    active: number;
    hourly: number;
    monthly: number;
    inactive: number;
  };
  error?: string;
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

const today = new Date().toISOString().slice(0, 10);

const emptyForm: FormState = {
  employee_id: "",
  pay_type: "hourly",
  hourly_rate: "",
  monthly_salary: "",
  standard_hours_per_month: "174",
  vacation_pay_percent: "12",
  effective_from: today,
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

function fmtMoney(value?: number | null) {
  if (value === null || value === undefined) return "—";

  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
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

function fmtNumber(value?: number | null) {
  if (value === null || value === undefined) return "—";

  return new Intl.NumberFormat("sv-SE", {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function LonLonesatserPage() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [rates, setRates] = useState<RateRow[]>([]);
  const [summary, setSummary] = useState<ApiResponse["summary"]>({
    total: 0,
    active: 0,
    hourly: 0,
    monthly: 0,
    inactive: 0,
  });

  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [q, setQ] = useState("");
  const [payType, setPayType] = useState("");
  const [active, setActive] = useState("true");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function getEmployee(id?: string | null) {
    return employees.find((employee) => employee.id === id);
  }

  async function loadRates() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (q.trim()) params.set("q", q.trim());
      if (payType) params.set("pay_type", payType);
      if (active) params.set("active", active);

      const res = await fetch("/api/admin/lon/lonesatser?" + params.toString());
      const json: ApiResponse = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta lönesatser.");
      }

      setEmployees(json.employees || []);
      setRates(json.rates || []);
      setSummary(json.summary || { total: 0, active: 0, hourly: 0, monthly: 0, inactive: 0 });
      setNeedsSetup(Boolean(json.needsSetup));

      if (!form.employee_id && json.employees && json.employees.length > 0) {
        setForm((prev) => ({ ...prev, employee_id: json.employees?.[0]?.id || "" }));
      }
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function createRate(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/lon/lonesatser", {
        method: "POST",
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
      setForm((prev) => ({
        ...emptyForm,
        employee_id: prev.employee_id,
      }));
      setShowForm(false);
      await loadRates();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara lönesatsen.");
    } finally {
      setSaving(false);
    }
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

  useEffect(() => {
    loadRates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTotal = useMemo(() => rates.length, [rates]);

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
                  Timlön / månadslön
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Här sätter du lön per anställd. Lönearter bestämmer vad som finns, men här bestämmer du vad varje person faktiskt har i lön.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm((value) => !value)}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49]"
                >
                  {showForm ? "Stäng formulär" : "Ny lönesats"}
                </button>

                <button
                  type="button"
                  onClick={loadRates}
                  className="inline-flex items-center justify-center rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3548]"
                >
                  Uppdatera
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-5">
              <SummaryCard label="Totalt" value={summary?.total || 0} />
              <SummaryCard label="Aktiva" value={summary?.active || 0} tone="green" />
              <SummaryCard label="Timlön" value={summary?.hourly || 0} tone="blue" />
              <SummaryCard label="Månadslön" value={summary?.monthly || 0} tone="amber" />
              <SummaryCard label="Inaktiva" value={summary?.inactive || 0} tone="slate" />
            </div>

            {needsSetup && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800 shadow-sm">
                <h2 className="text-base font-bold">
                  Lönesatstabellen saknas ännu
                </h2>
                <p className="mt-2 text-sm leading-6">
                  Tabellen <strong>payroll_employee_rates</strong> saknas i databasen. Kör SQL-koden nedan så kan timlön och månadslön sparas.
                </p>
              </section>
            )}

            {showForm && (
              <form
                onSubmit={createRate}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-2 border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Ny lönesats
                  </h2>
                  <p className="text-sm text-slate-500">
                    Välj anställd, lönetyp, belopp och från vilket datum lönen ska gälla.
                  </p>
                </div>

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

                  <Field
                    label="Timlön"
                    value={form.hourly_rate}
                    onChange={(value) => updateField("hourly_rate", value)}
                    placeholder="Ex. 180"
                  />

                  <Field
                    label="Månadslön"
                    value={form.monthly_salary}
                    onChange={(value) => updateField("monthly_salary", value)}
                    placeholder="Ex. 32000"
                  />

                  <Field
                    label="Standard timmar/månad"
                    value={form.standard_hours_per_month}
                    onChange={(value) => updateField("standard_hours_per_month", value)}
                    placeholder="Ex. 174"
                  />

                  <Field
                    label="Semesterersättning %"
                    value={form.vacation_pay_percent}
                    onChange={(value) => updateField("vacation_pay_percent", value)}
                    placeholder="Ex. 12"
                  />

                  <Field
                    label="Gäller från"
                    type="date"
                    value={form.effective_from}
                    onChange={(value) => updateField("effective_from", value)}
                  />

                  <Field
                    label="Gäller till"
                    type="date"
                    value={form.effective_to}
                    onChange={(value) => updateField("effective_to", value)}
                  />

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

                <div className="mt-4">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Anteckning
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    rows={4}
                    placeholder="Ex. enligt avtal, provanställning, ny lön från visst datum..."
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                  />
                </div>

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
                    className="rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Sparar..." : "Spara lönesats"}
                  </button>
                </div>
              </form>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[1fr_220px_180px_140px]">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Sök
                  </label>
                  <input
                    value={q}
                    onChange={(event) => setQ(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") loadRates();
                    }}
                    placeholder="Sök namn, roll, lönetyp eller anteckning..."
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                  />
                </div>

                <SelectField
                  label="Lönetyp"
                  value={payType}
                  onChange={setPayType}
                  options={[
                    ["", "Alla"],
                    ["hourly", "Timlön"],
                    ["monthly", "Månadslön"],
                  ]}
                />

                <SelectField
                  label="Aktiv"
                  value={active}
                  onChange={setActive}
                  options={[
                    ["", "Alla"],
                    ["true", "Aktiva"],
                    ["false", "Inaktiva"],
                  ]}
                />

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={loadRates}
                    className="w-full rounded-xl bg-[#00645d] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#004f49]"
                  >
                    Filtrera
                  </button>
                </div>
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
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Register över lönesatser
                  </h2>
                  <p className="text-sm text-slate-500">
                    Visar {filteredTotal} lönesatser
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1180px] w-full border-collapse text-left text-sm">
                  <thead className="bg-[#194C66] text-white">
                    <tr>
                      <Th>Anställd</Th>
                      <Th>Lönetyp</Th>
                      <Th>Timlön</Th>
                      <Th>Månadslön</Th>
                      <Th>Semester</Th>
                      <Th>Gäller</Th>
                      <Th>Status</Th>
                      <Th>Anteckning</Th>
                      <Th>Öppna</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-8 text-center text-slate-500">
                          Laddar lönesatser...
                        </td>
                      </tr>
                    ) : rates.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-10 text-center">
                          <div className="mx-auto max-w-lg">
                            <div className="text-base font-bold text-[#194C66]">
                              Inga lönesatser hittades
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              Skapa första lönesatsen med knappen Ny lönesats.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      rates.map((rate) => {
                        const employee = getEmployee(rate.employee_id);

                        return (
                          <tr key={rate.id} onClick={() => { window.location.href = "/admin/lon/lonesatser/" + encodeURIComponent(rate.id); }} className="cursor-pointer align-top transition hover:bg-slate-50">
                            <Td>
                              <div className="font-bold text-[#194C66]">
                                {employeeName(employee)}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {roleLabel(employee?.role)}
                              </div>
                            </Td>

                            <Td>
                              <span className={"inline-flex rounded-full px-3 py-1 text-xs font-semibold " + payTypeClass(rate.pay_type)}>
                                {payTypeLabel(rate.pay_type)}
                              </span>
                            </Td>

                            <Td>
                              <div className="font-semibold text-slate-900">
                                {fmtMoney(rate.hourly_rate)}
                              </div>
                            </Td>

                            <Td>
                              <div className="font-semibold text-slate-900">
                                {fmtMoney(rate.monthly_salary)}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {fmtNumber(rate.standard_hours_per_month)} h/mån
                              </div>
                            </Td>

                            <Td>
                              {fmtNumber(rate.vacation_pay_percent)} %
                            </Td>

                            <Td>
                              <div className="text-slate-700">
                                Från: {fmtDate(rate.effective_from)}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                Till: {fmtDate(rate.effective_to)}
                              </div>
                            </Td>

                            <Td>
                              <span className={"inline-flex rounded-full px-3 py-1 text-xs font-semibold " + (rate.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700")}>
                                {rate.is_active ? "Aktiv" : "Inaktiv"}
                              </span>
                            </Td>

                            <Td>
                              <div className="max-w-[260px] truncate text-slate-600">
                                {rate.notes || "—"}
                              </div>
                            </Td>

                            <Td>
                              <button
                                type="button"
                                aria-label="Öppna lönesats"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  window.location.href = "/admin/lon/lonesatser/" + encodeURIComponent(rate.id);
                                }}
                                className="rounded-xl bg-[#00645d] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#004f49]"
                              >
                                Öppna
                              </button>
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
  tone,
}: {
  label: string;
  value: number;
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
      <div className="mt-2 text-3xl font-bold">{value}</div>
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
