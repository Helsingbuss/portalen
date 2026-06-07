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
  tax_method: string;
  tax_table_number: string;
  tax_column: string;
  preliminary_tax_percent: string;
  fixed_tax_amount: string;
  extra_tax_amount: string;
  municipality: string;
  is_main_employer: boolean;
  decision_reference: string;
  valid_from: string;
  valid_to: string;
  is_active: boolean;
  notes: string;
};

const emptyForm: FormState = {
  employee_id: "",
  tax_method: "manual_percent",
  tax_table_number: "",
  tax_column: "1",
  preliminary_tax_percent: "30",
  fixed_tax_amount: "0",
  extra_tax_amount: "0",
  municipality: "",
  is_main_employer: true,
  decision_reference: "",
  valid_from: "",
  valid_to: "",
  is_active: true,
  notes: "",
};

function employeeName(employee?: EmployeeRow) {
  if (!employee) return "—";
  return [employee.first_name, employee.last_name].filter(Boolean).join(" ") || "Anställd";
}

function roleLabel(role?: string | null) {
  switch (role) {
    case "driver": return "Chaufför";
    case "traffic_manager": return "Trafikledare";
    case "booking_agent": return "Bokningsagent";
    case "admin": return "Administratör";
    case "employee": return "Anställd";
    default: return role || "Personal";
  }
}

export default function LonSkatteprofilDetailPage() {
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
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function loadProfile() {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/lon/skatteprofiler/" + encodeURIComponent(id));
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) throw new Error(json.error || "Kunde inte hämta skatteprofil.");

      const p = json.profile || {};
      setEmployees(json.employees || []);
      setCreatedAt(p.created_at || "");
      setUpdatedAt(p.updated_at || "");

      setForm({
        employee_id: p.employee_id || "",
        tax_method: p.tax_method || "manual_percent",
        tax_table_number: p.tax_table_number || "",
        tax_column: p.tax_column || "1",
        preliminary_tax_percent: p.preliminary_tax_percent !== null && p.preliminary_tax_percent !== undefined ? String(p.preliminary_tax_percent) : "30",
        fixed_tax_amount: p.fixed_tax_amount !== null && p.fixed_tax_amount !== undefined ? String(p.fixed_tax_amount) : "0",
        extra_tax_amount: p.extra_tax_amount !== null && p.extra_tax_amount !== undefined ? String(p.extra_tax_amount) : "0",
        municipality: p.municipality || "",
        is_main_employer: p.is_main_employer !== false,
        decision_reference: p.decision_reference || "",
        valid_from: p.valid_from ? String(p.valid_from).slice(0, 10) : "",
        valid_to: p.valid_to ? String(p.valid_to).slice(0, 10) : "",
        is_active: p.is_active !== false,
        notes: p.notes || "",
      });
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/lon/skatteprofiler/" + encodeURIComponent(id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) throw new Error(json.error || "Kunde inte spara skatteprofil.");

      setMessage("Skatteprofilen sparades.");
      await loadProfile();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara skatteprofil.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const employee = selectedEmployee();

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="px-6 pb-8 pt-10">
          <form onSubmit={saveProfile} className="w-full space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00645d]">Lön</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">{loading ? "Skatteprofil" : employeeName(employee)}</h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  {roleLabel(employee?.role)}
                  {updatedAt ? " · Uppdaterad " + new Date(updatedAt).toLocaleString("sv-SE") : ""}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/admin/lon/skatteprofiler" className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66]">Tillbaka</Link>
                <button type="button" onClick={loadProfile} className="rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white">Uppdatera</button>
                <button type="submit" disabled={saving || loading} className="rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Sparar..." : "Spara skatteprofil"}</button>
              </div>
            </div>

            {error && <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">{error}</section>}
            {message && <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-700">{message}</section>}

            {loading ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">Laddar skatteprofil...</section>
            ) : (
              <>
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">Skatteuppgifter</h2>

                  <div className="mt-5 grid gap-4 lg:grid-cols-4">
                    <SelectField label="Anställd" value={form.employee_id} onChange={(value) => updateField("employee_id", value)} options={[["", "Välj anställd"], ...employees.map((employee) => [employee.id, employeeName(employee) + " · " + roleLabel(employee.role)] as [string, string])]} />
                    <SelectField label="Skatteläge" value={form.tax_method} onChange={(value) => updateField("tax_method", value)} options={[["manual_percent", "Manuell procent"], ["table", "Skattetabell"], ["side_income_30", "Sidoinkomst 30 %"], ["decision", "Beslut/jämkning"]]} />
                    <Field label="Skattetabell" value={form.tax_table_number} onChange={(value) => updateField("tax_table_number", value)} />
                    <Field label="Kolumn" value={form.tax_column} onChange={(value) => updateField("tax_column", value)} />
                    <Field label="Preliminär skatt %" value={form.preliminary_tax_percent} onChange={(value) => updateField("preliminary_tax_percent", value)} />
                    <Field label="Fast skatt kr" value={form.fixed_tax_amount} onChange={(value) => updateField("fixed_tax_amount", value)} />
                    <Field label="Extra skatt kr" value={form.extra_tax_amount} onChange={(value) => updateField("extra_tax_amount", value)} />
                    <Field label="Kommun" value={form.municipality} onChange={(value) => updateField("municipality", value)} />
                    <SelectField label="Huvudarbetsgivare" value={form.is_main_employer ? "true" : "false"} onChange={(value) => updateField("is_main_employer", value === "true")} options={[["true", "Ja"], ["false", "Nej"]]} />
                    <Field label="Beslut / referens" value={form.decision_reference} onChange={(value) => updateField("decision_reference", value)} />
                    <Field label="Gäller från" type="date" value={form.valid_from} onChange={(value) => updateField("valid_from", value)} />
                    <Field label="Gäller till" type="date" value={form.valid_to} onChange={(value) => updateField("valid_to", value)} />
                    <SelectField label="Aktiv" value={form.is_active ? "true" : "false"} onChange={(value) => updateField("is_active", value === "true")} options={[["true", "Ja"], ["false", "Nej"]]} />
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">Anteckning</h2>
                  <textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} rows={6} className="mt-5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66]" />
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

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <div><label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label><input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66]" /></div>;
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) {
  return <div><label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label><select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66]">{options.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>;
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 px-4 py-3"><div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div><div className="mt-1 font-semibold text-slate-800">{value}</div></div>;
}
