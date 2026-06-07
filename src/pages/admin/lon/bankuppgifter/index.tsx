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
};

type BankDetailRow = {
  id: string;
  employee_id?: string | null;
  recipient_name?: string | null;
  bank_name?: string | null;
  clearing_number?: string | null;
  account_number?: string | null;
  iban?: string | null;
  bic?: string | null;
  payslip_email?: string | null;
  delivery_app_enabled?: boolean | null;
  delivery_email_enabled?: boolean | null;
  delivery_kivra_enabled?: boolean | null;
  kivra_identifier?: string | null;
  is_active?: boolean | null;
  notes?: string | null;
  created_at?: string | null;
};

type ApiResponse = {
  ok: boolean;
  needsSetup?: boolean;
  employees?: EmployeeRow[];
  bankDetails?: BankDetailRow[];
  summary?: {
    total: number;
    active: number;
    missing: number;
    app: number;
    email: number;
    kivra: number;
  };
  error?: string;
};

type FormState = {
  employee_id: string;
  recipient_name: string;
  bank_name: string;
  clearing_number: string;
  account_number: string;
  iban: string;
  bic: string;
  payslip_email: string;
  delivery_app_enabled: boolean;
  delivery_email_enabled: boolean;
  delivery_kivra_enabled: boolean;
  kivra_identifier: string;
  is_active: boolean;
  notes: string;
};

const emptyForm: FormState = {
  employee_id: "",
  recipient_name: "",
  bank_name: "",
  clearing_number: "",
  account_number: "",
  iban: "",
  bic: "",
  payslip_email: "",
  delivery_app_enabled: true,
  delivery_email_enabled: true,
  delivery_kivra_enabled: false,
  kivra_identifier: "",
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

function maskAccount(value?: string | null) {
  const text = String(value || "").replace(/\s/g, "");
  if (!text) return "—";
  if (text.length <= 4) return "****";
  return "**** " + text.slice(-4);
}

function yesNo(value?: boolean | null) {
  return value ? "Ja" : "Nej";
}

export default function LonBankuppgifterPage() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [bankDetails, setBankDetails] = useState<BankDetailRow[]>([]);
  const [summary, setSummary] = useState<ApiResponse["summary"]>({
    total: 0,
    active: 0,
    missing: 0,
    app: 0,
    email: 0,
    kivra: 0,
  });

  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [q, setQ] = useState("");
  const [active, setActive] = useState("true");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function getEmployee(id?: string | null) {
    return employees.find((employee) => employee.id === id);
  }

  async function loadBankDetails() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (q.trim()) params.set("q", q.trim());
      if (active) params.set("active", active);

      const res = await fetch("/api/admin/lon/bankuppgifter?" + params.toString());
      const json: ApiResponse = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta bankuppgifter.");
      }

      setEmployees(json.employees || []);
      setBankDetails(json.bankDetails || []);
      setSummary(json.summary || { total: 0, active: 0, missing: 0, app: 0, email: 0, kivra: 0 });
      setNeedsSetup(Boolean(json.needsSetup));

      if (!form.employee_id && json.employees && json.employees.length > 0) {
        const first = json.employees[0];
        setForm((prev) => ({
          ...prev,
          employee_id: first.id,
          recipient_name: employeeName(first),
          payslip_email: first.email || "",
        }));
      }
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function createBankDetail(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/lon/bankuppgifter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara bankuppgifter.");
      }

      setMessage("Bankuppgifter sparades.");
      setForm(emptyForm);
      setShowForm(false);
      await loadBankDetails();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara bankuppgifter.");
    } finally {
      setSaving(false);
    }
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };

      if (key === "employee_id") {
        const employee = employees.find((item) => item.id === value);
        if (employee) {
          next.recipient_name = employeeName(employee);
          next.payslip_email = employee.email || "";
        }
      }

      return next;
    });
  }

  useEffect(() => {
    loadBankDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTotal = useMemo(() => bankDetails.length, [bankDetails]);

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
                  Bankuppgifter
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Här sparas löneutbetalningsuppgifter per anställd. Detta behövs för framtida Swedbank-/bankfil och lönebeskedsleverans.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm((value) => !value)}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49]"
                >
                  {showForm ? "Stäng formulär" : "Ny bankuppgift"}
                </button>

                <button
                  type="button"
                  onClick={loadBankDetails}
                  className="inline-flex items-center justify-center rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3548]"
                >
                  Uppdatera
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-6">
              <SummaryCard label="Totalt" value={summary?.total || 0} />
              <SummaryCard label="Aktiva" value={summary?.active || 0} tone="green" />
              <SummaryCard label="Saknar" value={summary?.missing || 0} tone="red" />
              <SummaryCard label="App" value={summary?.app || 0} tone="blue" />
              <SummaryCard label="E-post" value={summary?.email || 0} tone="blue" />
              <SummaryCard label="Kivra" value={summary?.kivra || 0} tone="slate" />
            </div>

            {needsSetup && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800 shadow-sm">
                Tabellen <strong>payroll_employee_bank_details</strong> saknas. Kör SQL-koden nedan innan bankuppgifter kan sparas.
              </section>
            )}

            {showForm && (
              <form onSubmit={createBankDetail} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-2 border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Ny bankuppgift
                  </h2>
                  <p className="text-sm text-slate-500">
                    Lägg in bankkonto och leveransval för lönebesked.
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

                  <Field label="Mottagarnamn" value={form.recipient_name} onChange={(value) => updateField("recipient_name", value)} />
                  <Field label="Bank" value={form.bank_name} onChange={(value) => updateField("bank_name", value)} placeholder="Ex. Swedbank" />
                  <Field label="Clearingnummer" value={form.clearing_number} onChange={(value) => updateField("clearing_number", value)} />
                  <Field label="Kontonummer" value={form.account_number} onChange={(value) => updateField("account_number", value)} />
                  <Field label="IBAN valfritt" value={form.iban} onChange={(value) => updateField("iban", value)} />
                  <Field label="BIC valfritt" value={form.bic} onChange={(value) => updateField("bic", value)} />
                  <Field label="E-post lönebesked" value={form.payslip_email} onChange={(value) => updateField("payslip_email", value)} />

                  <SelectField
                    label="Personalappen"
                    value={form.delivery_app_enabled ? "true" : "false"}
                    onChange={(value) => updateField("delivery_app_enabled", value === "true")}
                    options={[["true", "Ja"], ["false", "Nej"]]}
                  />

                  <SelectField
                    label="E-postavisering"
                    value={form.delivery_email_enabled ? "true" : "false"}
                    onChange={(value) => updateField("delivery_email_enabled", value === "true")}
                    options={[["true", "Ja"], ["false", "Nej"]]}
                  />

                  <SelectField
                    label="Kivra senare"
                    value={form.delivery_kivra_enabled ? "true" : "false"}
                    onChange={(value) => updateField("delivery_kivra_enabled", value === "true")}
                    options={[["false", "Nej"], ["true", "Ja"]]}
                  />

                  <Field label="Kivra-ID senare" value={form.kivra_identifier} onChange={(value) => updateField("kivra_identifier", value)} />

                  <SelectField
                    label="Aktiv"
                    value={form.is_active ? "true" : "false"}
                    onChange={(value) => updateField("is_active", value === "true")}
                    options={[["true", "Ja"], ["false", "Nej"]]}
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
                    placeholder="Ex. kontrollera konto innan första bankfil..."
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
                    {saving ? "Sparar..." : "Spara bankuppgift"}
                  </button>
                </div>
              </form>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[1fr_180px_140px]">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Sök
                  </label>
                  <input
                    value={q}
                    onChange={(event) => setQ(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") loadBankDetails();
                    }}
                    placeholder="Sök namn, bank, e-post eller anteckning..."
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                  />
                </div>

                <SelectField
                  label="Aktiv"
                  value={active}
                  onChange={setActive}
                  options={[["", "Alla"], ["true", "Aktiva"], ["false", "Inaktiva"]]}
                />

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={loadBankDetails}
                    className="w-full rounded-xl bg-[#00645d] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#004f49]"
                  >
                    Filtrera
                  </button>
                </div>
              </div>

              {(message || error) && (
                <div className={"mt-4 rounded-xl px-4 py-3 text-sm font-semibold " + (error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700")}>
                  {error || message}
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Register över bankuppgifter
                  </h2>
                  <p className="text-sm text-slate-500">
                    Visar {filteredTotal} bankuppgifter
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1280px] w-full border-collapse text-left text-sm">
                  <thead className="bg-[#194C66] text-white">
                    <tr>
                      <Th>Anställd</Th>
                      <Th>Mottagare</Th>
                      <Th>Bank</Th>
                      <Th>Clearing</Th>
                      <Th>Konto</Th>
                      <Th>Lönebesked</Th>
                      <Th>Status</Th>
                      <Th>Anteckning</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-8 text-center text-slate-500">
                          Laddar bankuppgifter...
                        </td>
                      </tr>
                    ) : bankDetails.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-10 text-center">
                          <div className="mx-auto max-w-lg">
                            <div className="text-base font-bold text-[#194C66]">
                              Inga bankuppgifter hittades
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              Skapa första bankuppgiften med knappen Ny bankuppgift.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      bankDetails.map((item) => {
                        const employee = getEmployee(item.employee_id);

                        return (
                          <tr
                            key={item.id}
                            onClick={() => {
                              window.location.href = "/admin/lon/bankuppgifter/" + encodeURIComponent(item.id);
                            }}
                            className="cursor-pointer align-top transition hover:bg-slate-50"
                          >
                            <Td>
                              <div className="font-bold text-[#194C66]">{employeeName(employee)}</div>
                              <div className="mt-1 text-xs text-slate-500">{roleLabel(employee?.role)}</div>
                            </Td>

                            <Td>{item.recipient_name || "—"}</Td>
                            <Td>{item.bank_name || "—"}</Td>
                            <Td>{item.clearing_number || "—"}</Td>
                            <Td>{maskAccount(item.account_number || item.iban)}</Td>
                            <Td>
                              <div className="space-y-1 text-xs text-slate-600">
                                <div>App: {yesNo(item.delivery_app_enabled)}</div>
                                <div>E-post: {yesNo(item.delivery_email_enabled)}</div>
                                <div>Kivra: {yesNo(item.delivery_kivra_enabled)}</div>
                              </div>
                            </Td>

                            <Td>
                              <span className={"inline-flex rounded-full px-3 py-1 text-xs font-semibold " + (item.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700")}>
                                {item.is_active ? "Aktiv" : "Inaktiv"}
                              </span>
                            </Td>

                            <Td>
                              <div className="max-w-[260px] truncate text-slate-600">
                                {item.notes || "—"}
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

function SummaryCard({ label, value, tone }: { label: string; value: number; tone?: "green" | "amber" | "red" | "blue" | "slate" }) {
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

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) {
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
