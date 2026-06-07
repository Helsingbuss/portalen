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

type TaxProfileRow = {
  id: string;
  employee_id?: string | null;
  tax_method?: string | null;
  tax_table_number?: string | null;
  tax_column?: string | null;
  preliminary_tax_percent?: number | null;
  fixed_tax_amount?: number | null;
  extra_tax_amount?: number | null;
  municipality?: string | null;
  is_main_employer?: boolean | null;
  decision_reference?: string | null;
  valid_from?: string | null;
  valid_to?: string | null;
  is_active?: boolean | null;
  notes?: string | null;
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
  valid_from: new Date().toISOString().slice(0, 10),
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

function methodLabel(method?: string | null) {
  switch (method) {
    case "table": return "Skattetabell";
    case "side_income_30": return "Sidoinkomst 30 %";
    case "decision": return "Beslut/jämkning";
    case "manual_percent": return "Manuell procent";
    default: return method || "Skatt";
  }
}

function methodClass(method?: string | null) {
  switch (method) {
    case "table": return "bg-blue-100 text-blue-700";
    case "side_income_30": return "bg-purple-100 text-purple-700";
    case "decision": return "bg-amber-100 text-amber-700";
    case "manual_percent": return "bg-slate-100 text-slate-700";
    default: return "bg-slate-100 text-slate-700";
  }
}

export default function LonSkatteprofilerPage() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [profiles, setProfiles] = useState<TaxProfileRow[]>([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, missing: 0, table: 0, sideIncome: 0, decision: 0, manual: 0 });

  const [q, setQ] = useState("");
  const [active, setActive] = useState("true");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function getEmployee(id?: string | null) {
    return employees.find((employee) => employee.id === id);
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function loadProfiles() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (active) params.set("active", active);

      const res = await fetch("/api/admin/lon/skatteprofiler?" + params.toString());
      const json = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !json.ok) throw new Error(json.error || "Kunde inte hämta skatteprofiler.");

      setEmployees(json.employees || []);
      setProfiles(json.profiles || []);
      setSummary(json.summary || { total: 0, active: 0, missing: 0, table: 0, sideIncome: 0, decision: 0, manual: 0 });
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

  async function createProfile(event: FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/lon/skatteprofiler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) throw new Error(json.error || "Kunde inte spara skatteprofil.");

      setMessage("Skatteprofilen sparades.");
      setForm(emptyForm);
      setShowForm(false);
      await loadProfiles();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara skatteprofil.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTotal = useMemo(() => profiles.length, [profiles]);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="px-6 pb-8 pt-10">
          <div className="w-full space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00645d]">Lön</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">Skatteprofiler</h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Lägg in skatteuppgifter per anställd. Skatteavdrag / nettolön använder dessa profiler vid beräkning.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => setShowForm((v) => !v)} className="rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white">
                  {showForm ? "Stäng formulär" : "Ny skatteprofil"}
                </button>
                <button type="button" onClick={loadProfiles} className="rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white">
                  Uppdatera
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-6">
              <SummaryCard label="Totalt" value={summary.total} />
              <SummaryCard label="Aktiva" value={summary.active} tone="green" />
              <SummaryCard label="Saknar" value={summary.missing} tone="red" />
              <SummaryCard label="Tabell" value={summary.table} tone="blue" />
              <SummaryCard label="30 %" value={summary.sideIncome} tone="slate" />
              <SummaryCard label="Beslut" value={summary.decision} tone="amber" />
            </div>

            {needsSetup && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800 shadow-sm">
                Tabellen <strong>payroll_employee_tax_profiles</strong> saknas. Kör SQL-koden nedan först.
              </section>
            )}

            {showForm && (
              <form onSubmit={createProfile} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-[#194C66]">Ny skatteprofil</h2>

                <div className="mt-5 grid gap-4 lg:grid-cols-4">
                  <SelectField label="Anställd" value={form.employee_id} onChange={(value) => updateField("employee_id", value)} options={[["", "Välj anställd"], ...employees.map((employee) => [employee.id, employeeName(employee) + " · " + roleLabel(employee.role)] as [string, string])]} />
                  <SelectField label="Skatteläge" value={form.tax_method} onChange={(value) => updateField("tax_method", value)} options={[["manual_percent", "Manuell procent"], ["table", "Skattetabell"], ["side_income_30", "Sidoinkomst 30 %"], ["decision", "Beslut/jämkning"]]} />
                  <Field label="Skattetabell" value={form.tax_table_number} onChange={(value) => updateField("tax_table_number", value)} placeholder="Ex. 32" />
                  <Field label="Kolumn" value={form.tax_column} onChange={(value) => updateField("tax_column", value)} placeholder="Ex. 1" />
                  <Field label="Preliminär skatt %" value={form.preliminary_tax_percent} onChange={(value) => updateField("preliminary_tax_percent", value)} />
                  <Field label="Fast skatt kr" value={form.fixed_tax_amount} onChange={(value) => updateField("fixed_tax_amount", value)} />
                  <Field label="Extra skatt kr" value={form.extra_tax_amount} onChange={(value) => updateField("extra_tax_amount", value)} />
                  <Field label="Kommun" value={form.municipality} onChange={(value) => updateField("municipality", value)} placeholder="Ex. Helsingborg" />
                  <SelectField label="Huvudarbetsgivare" value={form.is_main_employer ? "true" : "false"} onChange={(value) => updateField("is_main_employer", value === "true")} options={[["true", "Ja"], ["false", "Nej"]]} />
                  <Field label="Beslut / referens" value={form.decision_reference} onChange={(value) => updateField("decision_reference", value)} />
                  <Field label="Gäller från" type="date" value={form.valid_from} onChange={(value) => updateField("valid_from", value)} />
                  <Field label="Gäller till" type="date" value={form.valid_to} onChange={(value) => updateField("valid_to", value)} />
                  <SelectField label="Aktiv" value={form.is_active ? "true" : "false"} onChange={(value) => updateField("is_active", value === "true")} options={[["true", "Ja"], ["false", "Nej"]]} />
                </div>

                <textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} rows={4} placeholder="Anteckning..." className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />

                <div className="mt-5 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66]">Avbryt</button>
                  <button type="submit" disabled={saving} className="rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Sparar..." : "Spara skatteprofil"}</button>
                </div>
              </form>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[1fr_180px_140px]">
                <Field label="Sök" value={q} onChange={setQ} placeholder="Sök namn, tabell, kommun..." />
                <SelectField label="Aktiv" value={active} onChange={setActive} options={[["", "Alla"], ["true", "Aktiva"], ["false", "Inaktiva"]]} />
                <div className="flex items-end"><button type="button" onClick={loadProfiles} className="w-full rounded-xl bg-[#00645d] px-4 py-3 text-sm font-semibold text-white">Filtrera</button></div>
              </div>

              {(message || error) && (
                <div className={"mt-4 rounded-xl px-4 py-3 text-sm font-semibold " + (error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700")}>
                  {error || message}
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-lg font-bold text-[#194C66]">Skatteprofiler</h2>
                <p className="text-sm text-slate-500">Visar {filteredTotal} profiler</p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1260px] w-full border-collapse text-left text-sm">
                  <thead className="bg-[#194C66] text-white">
                    <tr>
                      <Th>Anställd</Th>
                      <Th>Skatteläge</Th>
                      <Th>Tabell/kolumn</Th>
                      <Th>Procent</Th>
                      <Th>Extra/Fast skatt</Th>
                      <Th>Kommun</Th>
                      <Th>Huvudarbetsgivare</Th>
                      <Th>Gäller</Th>
                      <Th>Status</Th>
                      <Th>Anteckning</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr><td colSpan={10} className="px-5 py-8 text-center text-slate-500">Laddar skatteprofiler...</td></tr>
                    ) : profiles.length === 0 ? (
                      <tr><td colSpan={10} className="px-5 py-10 text-center text-slate-500">Inga skatteprofiler hittades.</td></tr>
                    ) : (
                      profiles.map((profile) => {
                        const employee = getEmployee(profile.employee_id);
                        return (
                          <tr key={profile.id} onClick={() => { window.location.href = "/admin/lon/skatteprofiler/" + encodeURIComponent(profile.id); }} className="cursor-pointer align-top transition hover:bg-slate-50">
                            <Td><div className="font-bold text-[#194C66]">{employeeName(employee)}</div><div className="mt-1 text-xs text-slate-500">{roleLabel(employee?.role)}</div></Td>
                            <Td><span className={"inline-flex rounded-full px-3 py-1 text-xs font-semibold " + methodClass(profile.tax_method)}>{methodLabel(profile.tax_method)}</span></Td>
                            <Td>{profile.tax_table_number || "—"} / {profile.tax_column || "—"}</Td>
                            <Td>{profile.preliminary_tax_percent ?? 0} %</Td>
                            <Td>{profile.extra_tax_amount ?? 0} kr / {profile.fixed_tax_amount ?? 0} kr</Td>
                            <Td>{profile.municipality || "—"}</Td>
                            <Td>{profile.is_main_employer ? "Ja" : "Nej"}</Td>
                            <Td>{profile.valid_from || "—"} – {profile.valid_to || "tills vidare"}</Td>
                            <Td><span className={"inline-flex rounded-full px-3 py-1 text-xs font-semibold " + (profile.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700")}>{profile.is_active ? "Aktiv" : "Inaktiv"}</span></Td>
                            <Td><div className="max-w-[260px] truncate text-slate-600">{profile.notes || "—"}</div></Td>
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
  const color = tone === "green" ? "text-emerald-700 bg-emerald-50" : tone === "amber" ? "text-amber-700 bg-amber-50" : tone === "red" ? "text-red-700 bg-red-50" : tone === "blue" ? "text-blue-700 bg-blue-50" : tone === "slate" ? "text-slate-700 bg-slate-50" : "text-[#194C66] bg-white";
  return <div className={"rounded-2xl border border-slate-200 p-5 shadow-sm " + color}><div className="text-sm font-semibold opacity-80">{label}</div><div className="mt-2 text-3xl font-bold">{value}</div></div>;
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return <div><label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10" /></div>;
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) {
  return <div><label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label><select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10">{options.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>;
}

function Th({ children }: { children: ReactNode }) {
  return <th className="whitespace-nowrap px-5 py-4 text-xs font-bold uppercase tracking-wide">{children}</th>;
}

function Td({ children }: { children: ReactNode }) {
  return <td className="px-5 py-4">{children}</td>;
}
