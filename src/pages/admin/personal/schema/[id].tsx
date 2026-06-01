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
  role?: string | null;
};

type FormState = {
  employee_id: string;
  schedule_date: string;
  start_time: string;
  end_time: string;
  shift_type: string;
  status: string;
  location: string;
  related_assignment: string;
  break_minutes: string;
  notes: string;
};

const emptyForm: FormState = {
  employee_id: "",
  schedule_date: new Date().toISOString().slice(0, 10),
  start_time: "08:00",
  end_time: "17:00",
  shift_type: "work",
  status: "available",
  location: "",
  related_assignment: "",
  break_minutes: "30",
  notes: "",
};

function employeeName(employee?: EmployeeRow) {
  if (!employee) return "—";
  return [employee.first_name, employee.last_name].filter(Boolean).join(" ") || "Personal";
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

function shiftTypeLabel(type?: string | null) {
  switch (type) {
    case "work":
      return "Arbetspass";
    case "driving":
      return "Körning";
    case "standby":
      return "Jour / standby";
    case "training":
      return "Utbildning";
    case "admin":
      return "Administration";
    case "other":
      return "Övrigt";
    default:
      return type || "Pass";
  }
}

function statusLabel(status?: string | null) {
  switch (status) {
    case "available":
      return "Tillgänglig";
    case "booked":
      return "Bokad";
    case "day_off":
      return "Ledig";
    case "sick":
      return "Sjuk";
    case "vacation":
      return "Semester";
    case "unavailable":
      return "Ej tillgänglig";
    default:
      return status || "Ej satt";
  }
}

function statusClass(status?: string | null) {
  switch (status) {
    case "available":
      return "bg-emerald-100 text-emerald-700";
    case "booked":
      return "bg-blue-100 text-blue-700";
    case "sick":
      return "bg-red-100 text-red-700";
    case "vacation":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function shiftClass(type?: string | null) {
  switch (type) {
    case "driving":
      return "bg-[#eef8fb] text-[#194C66]";
    case "standby":
      return "bg-purple-100 text-purple-700";
    case "training":
      return "bg-amber-100 text-amber-700";
    case "admin":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function fmtDate(value?: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("sv-SE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function PersonalSchemaDetailPage() {
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

  async function loadSchedule() {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/personal/schema/" + encodeURIComponent(id));
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta schemapasset.");
      }

      const schedule = json.schedule || {};

      setEmployees(json.employees || []);
      setCreatedAt(schedule.created_at || "");
      setUpdatedAt(schedule.updated_at || "");

      setForm({
        employee_id: schedule.employee_id || "",
        schedule_date: schedule.schedule_date ? String(schedule.schedule_date).slice(0, 10) : "",
        start_time: schedule.start_time ? String(schedule.start_time).slice(0, 5) : "",
        end_time: schedule.end_time ? String(schedule.end_time).slice(0, 5) : "",
        shift_type: schedule.shift_type || "work",
        status: schedule.status || "available",
        location: schedule.location || "",
        related_assignment: schedule.related_assignment || "",
        break_minutes:
          schedule.break_minutes !== null && schedule.break_minutes !== undefined
            ? String(schedule.break_minutes)
            : "0",
        notes: schedule.notes || "",
      });
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function saveSchedule(event: FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/personal/schema/" + encodeURIComponent(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara schemapasset.");
      }

      setMessage("Schemapasset sparades.");
      await loadSchedule();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara schemapasset.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadSchedule();
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
                  Personal
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  Schemapass
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  {employeeName(employee)} · {fmtDate(form.schedule_date)}
                  {updatedAt ? " · Uppdaterad " + new Date(updatedAt).toLocaleString("sv-SE") : ""}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/admin/personal/schema"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Tillbaka
                </Link>

                <button
                  type="submit"
                  form="schema-edit-form"
                  disabled={saving || loading}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Sparar..." : "Spara schema"}
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
                Laddar schemapass...
              </section>
            ) : (
              <form id="schema-edit-form" onSubmit={saveSchedule} className="space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Schemapass
                      </div>

                      <h2 className="mt-2 text-2xl font-bold text-[#194C66]">
                        {employeeName(employee)}
                      </h2>

                      <p className="mt-2 text-sm text-slate-600">
                        {form.start_time || "—"} – {form.end_time || "—"} · {roleLabel(employee?.role)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className={"inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold " + shiftClass(form.shift_type)}>
                        {shiftTypeLabel(form.shift_type)}
                      </span>

                      <span className={"inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold " + statusClass(form.status)}>
                        {statusLabel(form.status)}
                      </span>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Passuppgifter
                  </h2>

                  <div className="mt-5 grid gap-4 lg:grid-cols-4">
                    <SelectField
                      label="Personal / chaufför"
                      value={form.employee_id}
                      onChange={(value) => updateField("employee_id", value)}
                      options={[
                        ["", "Välj personal"],
                        ...employees.map((employee) => [
                          employee.id,
                          employeeName(employee) + " · " + roleLabel(employee.role),
                        ] as [string, string]),
                      ]}
                    />

                    <Field label="Datum" type="date" value={form.schedule_date} onChange={(value) => updateField("schedule_date", value)} />
                    <Field label="Starttid" type="time" value={form.start_time} onChange={(value) => updateField("start_time", value)} />
                    <Field label="Sluttid" type="time" value={form.end_time} onChange={(value) => updateField("end_time", value)} />

                    <SelectField
                      label="Pass-typ"
                      value={form.shift_type}
                      onChange={(value) => updateField("shift_type", value)}
                      options={[
                        ["work", "Arbetspass"],
                        ["driving", "Körning"],
                        ["standby", "Jour / standby"],
                        ["training", "Utbildning"],
                        ["admin", "Administration"],
                        ["other", "Övrigt"],
                      ]}
                    />

                    <SelectField
                      label="Status"
                      value={form.status}
                      onChange={(value) => updateField("status", value)}
                      options={[
                        ["available", "Tillgänglig"],
                        ["booked", "Bokad"],
                        ["day_off", "Ledig"],
                        ["sick", "Sjuk"],
                        ["vacation", "Semester"],
                        ["unavailable", "Ej tillgänglig"],
                      ]}
                    />

                    <Field label="Rast minuter" value={form.break_minutes} onChange={(value) => updateField("break_minutes", value)} />
                    <Field label="Plats" value={form.location} onChange={(value) => updateField("location", value)} />
                    <Field label="Koppling till körning" value={form.related_assignment} onChange={(value) => updateField("related_assignment", value)} />
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
                    placeholder="Ex. körning, uppdrag, tillgänglighet eller intern notering..."
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
