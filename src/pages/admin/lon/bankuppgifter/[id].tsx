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
  phone?: string | null;
  role?: string | null;
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

export default function LonBankuppgiftDetailPage() {
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

  async function loadBankDetail() {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/lon/bankuppgifter/" + encodeURIComponent(id));
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta bankuppgiften.");
      }

      const item = json.bankDetail || {};

      setEmployees(json.employees || []);
      setCreatedAt(item.created_at || "");
      setUpdatedAt(item.updated_at || "");

      setForm({
        employee_id: item.employee_id || "",
        recipient_name: item.recipient_name || "",
        bank_name: item.bank_name || "",
        clearing_number: item.clearing_number || "",
        account_number: item.account_number || "",
        iban: item.iban || "",
        bic: item.bic || "",
        payslip_email: item.payslip_email || "",
        delivery_app_enabled: Boolean(item.delivery_app_enabled),
        delivery_email_enabled: Boolean(item.delivery_email_enabled),
        delivery_kivra_enabled: Boolean(item.delivery_kivra_enabled),
        kivra_identifier: item.kivra_identifier || "",
        is_active: item.is_active !== false,
        notes: item.notes || "",
      });
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function saveBankDetail(event: FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/lon/bankuppgifter/" + encodeURIComponent(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara bankuppgiften.");
      }

      setMessage("Bankuppgiften sparades.");
      await loadBankDetail();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara bankuppgiften.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadBankDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const employee = selectedEmployee();

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="px-6 pb-8 pt-10">
          <form onSubmit={saveBankDetail} className="w-full space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00645d]">
                  Lön
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  {loading ? "Bankuppgift" : form.recipient_name || "Bankuppgift"}
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  {employeeName(employee)} · {roleLabel(employee?.role)}
                  {updatedAt ? " · Uppdaterad " + new Date(updatedAt).toLocaleString("sv-SE") : ""}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/admin/lon/bankuppgifter"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Tillbaka
                </Link>

                <button
                  type="button"
                  onClick={loadBankDetail}
                  className="inline-flex items-center justify-center rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3548]"
                >
                  Uppdatera
                </button>

                <button
                  type="submit"
                  disabled={saving || loading}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Sparar..." : "Spara bankuppgift"}
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
                Laddar bankuppgift...
              </section>
            ) : (
              <>
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">Bank och mottagare</h2>

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
                    <Field label="Bank" value={form.bank_name} onChange={(value) => updateField("bank_name", value)} />
                    <Field label="Clearingnummer" value={form.clearing_number} onChange={(value) => updateField("clearing_number", value)} />
                    <Field label="Kontonummer" value={form.account_number} onChange={(value) => updateField("account_number", value)} />
                    <Field label="IBAN" value={form.iban} onChange={(value) => updateField("iban", value)} />
                    <Field label="BIC" value={form.bic} onChange={(value) => updateField("bic", value)} />
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">Leverans av lönebesked</h2>

                  <div className="mt-5 grid gap-4 lg:grid-cols-4">
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
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">Anteckning</h2>

                  <textarea
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    rows={6}
                    placeholder="Intern anteckning..."
                    className="mt-5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                  />
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">Systeminformation</h2>

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

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
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

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 font-semibold text-slate-800">{value}</div>
    </div>
  );
}
