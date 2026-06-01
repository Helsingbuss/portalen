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
  status?: string | null;
};

type ScheduleRow = {
  id: string;
  employee_id?: string | null;
  schedule_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  shift_type?: string | null;
  status?: string | null;
  location?: string | null;
  related_assignment?: string | null;
  break_minutes?: number | null;
  notes?: string | null;
  created_at?: string | null;
};

type ApiResponse = {
  ok: boolean;
  needsSetup?: boolean;
  employees?: EmployeeRow[];
  schedules?: ScheduleRow[];
  summary?: {
    total: number;
    available: number;
    booked: number;
    dayOff: number;
    sick: number;
    vacation: number;
  };
  error?: string;
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

const today = new Date().toISOString().slice(0, 10);

const emptyForm: FormState = {
  employee_id: "",
  schedule_date: today,
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
    case "day_off":
      return "bg-slate-100 text-slate-700";
    case "sick":
      return "bg-red-100 text-red-700";
    case "vacation":
      return "bg-amber-100 text-amber-700";
    case "unavailable":
      return "bg-slate-100 text-slate-700";
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
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function weekStartDate() {
  const d = new Date();
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d.toISOString().slice(0, 10);
}

function weekEndDate() {
  const d = new Date(weekStartDate());
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
}

export default function PersonalSchemaPage() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [summary, setSummary] = useState<ApiResponse["summary"]>({
    total: 0,
    available: 0,
    booked: 0,
    dayOff: 0,
    sick: 0,
    vacation: 0,
  });

  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [shiftType, setShiftType] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [dateFrom, setDateFrom] = useState(weekStartDate());
  const [dateTo, setDateTo] = useState(weekEndDate());

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function getEmployee(id?: string | null) {
    return employees.find((employee) => employee.id === id);
  }

  async function loadSchedules() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      if (shiftType) params.set("shift_type", shiftType);
      if (employeeId) params.set("employee_id", employeeId);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);

      const res = await fetch("/api/admin/personal/schema?" + params.toString());
      const json: ApiResponse = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta schema.");
      }

      setEmployees(json.employees || []);
      setSchedules(json.schedules || []);
      setSummary(json.summary || { total: 0, available: 0, booked: 0, dayOff: 0, sick: 0, vacation: 0 });
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

  async function createSchedule(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/personal/schema", {
        method: "POST",
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
      setForm((prev) => ({
        ...emptyForm,
        employee_id: prev.employee_id,
        schedule_date: prev.schedule_date,
      }));
      setShowForm(false);
      await loadSchedules();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara schemapasset.");
    } finally {
      setSaving(false);
    }
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    loadSchedules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTotal = useMemo(() => schedules.length, [schedules]);

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
                  Schema
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Planera chaufförer och personal med pass, tillgänglighet, ledighet, sjukdom, semester och koppling till körningar senare.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm((value) => !value)}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49]"
                >
                  {showForm ? "Stäng formulär" : "Nytt schemapass"}
                </button>

                <button
                  type="button"
                  onClick={loadSchedules}
                  className="inline-flex items-center justify-center rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3548]"
                >
                  Uppdatera
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-6">
              <SummaryCard label="Totalt" value={summary?.total || 0} />
              <SummaryCard label="Tillgängliga" value={summary?.available || 0} tone="green" />
              <SummaryCard label="Bokade" value={summary?.booked || 0} tone="blue" />
              <SummaryCard label="Lediga" value={summary?.dayOff || 0} tone="slate" />
              <SummaryCard label="Sjuk" value={summary?.sick || 0} tone="red" />
              <SummaryCard label="Semester" value={summary?.vacation || 0} tone="amber" />
            </div>

            {needsSetup && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800 shadow-sm">
                <h2 className="text-base font-bold">
                  Schematabellen saknas ännu
                </h2>
                <p className="mt-2 text-sm leading-6">
                  Tabellen <strong>staff_schedules</strong> saknas i databasen. Kör SQL-koden nedan så kan schema skapas och visas.
                </p>
              </section>
            )}

            {showForm && (
              <form
                onSubmit={createSchedule}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-2 border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Nytt schemapass
                  </h2>
                  <p className="text-sm text-slate-500">
                    Välj personal, datum, tider, status och eventuell koppling till körning eller uppdrag.
                  </p>
                </div>

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

                  <Field label="Rast minuter" value={form.break_minutes} onChange={(value) => updateField("break_minutes", value)} placeholder="30" />
                  <Field label="Plats" value={form.location} onChange={(value) => updateField("location", value)} placeholder="Ex. Helsingborg" />
                  <Field label="Koppling till körning" value={form.related_assignment} onChange={(value) => updateField("related_assignment", value)} placeholder="Ex. körorder/offert/bokning" />
                </div>

                <div className="mt-4">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Anteckning
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    rows={4}
                    placeholder="Ex. tillgänglighet, körning, uppdrag, intern notering..."
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
                    {saving ? "Sparar..." : "Spara schema"}
                  </button>
                </div>
              </form>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[1fr_240px_180px_180px_180px_180px_140px]">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Sök
                  </label>
                  <input
                    value={q}
                    onChange={(event) => setQ(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") loadSchedules();
                    }}
                    placeholder="Sök personal, körning, plats eller anteckning..."
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                  />
                </div>

                <SelectField
                  label="Personal"
                  value={employeeId}
                  onChange={setEmployeeId}
                  options={[
                    ["", "Alla"],
                    ...employees.map((employee) => [
                      employee.id,
                      employeeName(employee),
                    ] as [string, string]),
                  ]}
                />

                <Field label="Från datum" type="date" value={dateFrom} onChange={setDateFrom} />
                <Field label="Till datum" type="date" value={dateTo} onChange={setDateTo} />

                <SelectField
                  label="Pass-typ"
                  value={shiftType}
                  onChange={setShiftType}
                  options={[
                    ["", "Alla"],
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
                  value={status}
                  onChange={setStatus}
                  options={[
                    ["", "Alla"],
                    ["available", "Tillgängliga"],
                    ["booked", "Bokade"],
                    ["day_off", "Lediga"],
                    ["sick", "Sjuk"],
                    ["vacation", "Semester"],
                    ["unavailable", "Ej tillgängliga"],
                  ]}
                />

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={loadSchedules}
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
                    Schemalista
                  </h2>
                  <p className="text-sm text-slate-500">
                    Visar {filteredTotal} pass
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1240px] w-full border-collapse text-left text-sm">
                  <thead className="bg-[#194C66] text-white">
                    <tr>
                      <Th>Datum</Th>
                      <Th>Personal</Th>
                      <Th>Tid</Th>
                      <Th>Typ</Th>
                      <Th>Status</Th>
                      <Th>Plats</Th>
                      <Th>Koppling</Th>
                      <Th>Anteckning</Th>
                      <Th>Öppna</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-8 text-center text-slate-500">
                          Laddar schema...
                        </td>
                      </tr>
                    ) : schedules.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-10 text-center">
                          <div className="mx-auto max-w-lg">
                            <div className="text-base font-bold text-[#194C66]">
                              Inga schemapass hittades
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              Skapa första passet med knappen Nytt schemapass.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      schedules.map((schedule) => {
                        const employee = getEmployee(schedule.employee_id);

                        return (
                          <tr key={schedule.id} onClick={() => { window.location.href = "/admin/personal/schema/" + encodeURIComponent(schedule.id); }} className="cursor-pointer align-top transition hover:bg-slate-50">
                            <Td>
                              <div className="font-bold text-[#194C66]">
                                {fmtDate(schedule.schedule_date)}
                              </div>
                            </Td>

                            <Td>
                              <div className="font-bold text-slate-900">
                                {employeeName(employee)}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {roleLabel(employee?.role)}
                              </div>
                            </Td>

                            <Td>
                              <div className="font-semibold text-slate-900">
                                {schedule.start_time || "—"} – {schedule.end_time || "—"}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                Rast: {schedule.break_minutes ?? 0} min
                              </div>
                            </Td>

                            <Td>
                              <span className={"inline-flex rounded-full px-3 py-1 text-xs font-semibold " + shiftClass(schedule.shift_type)}>
                                {shiftTypeLabel(schedule.shift_type)}
                              </span>
                            </Td>

                            <Td>
                              <span className={"inline-flex rounded-full px-3 py-1 text-xs font-semibold " + statusClass(schedule.status)}>
                                {statusLabel(schedule.status)}
                              </span>
                            </Td>

                            <Td>{schedule.location || "—"}</Td>

                            <Td>
                              <div className="max-w-[220px] truncate text-slate-700">
                                {schedule.related_assignment || "—"}
                              </div>
                            </Td>

                            <Td>
                              <div className="max-w-[260px] truncate text-slate-600">
                                {schedule.notes || "—"}
                              </div>
                            </Td>

                            <Td>
                              <button
                                type="button"
                                aria-label="Öppna schemapass"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  window.location.href = "/admin/personal/schema/" + encodeURIComponent(schedule.id);
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
