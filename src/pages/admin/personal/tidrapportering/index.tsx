import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type EmployeeRow = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
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
};

type TimeReportRow = {
  id: string;
  employee_id?: string | null;
  schedule_id?: string | null;
  report_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  break_minutes?: number | null;
  total_hours?: number | null;
  work_type?: string | null;
  status?: string | null;
  related_assignment?: string | null;
  km_start?: number | null;
  km_end?: number | null;
  deviation?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type ApiResponse = {
  ok: boolean;
  needsSetup?: boolean;
  employees?: EmployeeRow[];
  schedules?: ScheduleRow[];
  reports?: TimeReportRow[];
  summary?: {
    total: number;
    draft: number;
    submitted: number;
    approved: number;
    rejected: number;
    totalHours: number;
  };
  error?: string;
};

type FormState = {
  employee_id: string;
  schedule_id: string;
  report_date: string;
  start_time: string;
  end_time: string;
  break_minutes: string;
  total_hours: string;
  work_type: string;
  status: string;
  related_assignment: string;
  km_start: string;
  km_end: string;
  deviation: string;
  notes: string;
};

const today = new Date().toISOString().slice(0, 10);

const emptyForm: FormState = {
  employee_id: "",
  schedule_id: "",
  report_date: today,
  start_time: "08:00",
  end_time: "16:30",
  break_minutes: "30",
  total_hours: "",
  work_type: "driving",
  status: "draft",
  related_assignment: "",
  km_start: "",
  km_end: "",
  deviation: "",
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

function workTypeLabel(type?: string | null) {
  switch (type) {
    case "driving":
      return "Körning";
    case "admin":
      return "Administration";
    case "cleaning":
      return "Städ / fordonsvård";
    case "standby":
      return "Jour / standby";
    case "training":
      return "Utbildning";
    case "other":
      return "Övrigt";
    default:
      return type || "Arbete";
  }
}

function statusLabel(status?: string | null) {
  switch (status) {
    case "draft":
      return "Utkast";
    case "submitted":
      return "Inskickad";
    case "approved":
      return "Godkänd";
    case "rejected":
      return "Avvisad";
    default:
      return status || "Ej satt";
  }
}

function statusClass(status?: string | null) {
  switch (status) {
    case "approved":
      return "bg-emerald-100 text-emerald-700";
    case "submitted":
      return "bg-blue-100 text-blue-700";
    case "rejected":
      return "bg-red-100 text-red-700";
    case "draft":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function workTypeClass(type?: string | null) {
  switch (type) {
    case "driving":
      return "bg-[#eef8fb] text-[#194C66]";
    case "admin":
      return "bg-blue-100 text-blue-700";
    case "cleaning":
      return "bg-emerald-100 text-emerald-700";
    case "standby":
      return "bg-purple-100 text-purple-700";
    case "training":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
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

function fmtNumber(value?: string | number | null) {
  return new Intl.NumberFormat("sv-SE", {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
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

function timeToMinutes(value: string) {
  const parts = String(value || "").split(":");
  if (parts.length < 2) return null;

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

  return hours * 60 + minutes;
}

function calculateHours(start: string, end: string, breakMinutesText: string) {
  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);
  const breakMinutes = Number(breakMinutesText || 0);

  if (startMin === null || endMin === null) return "";

  let diff = endMin - startMin;

  if (diff < 0) {
    diff += 24 * 60;
  }

  const total = Math.max(diff - (Number.isFinite(breakMinutes) ? breakMinutes : 0), 0);

  return String(Number((total / 60).toFixed(2)));
}

export default function PersonalTidrapporteringPage() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [reports, setReports] = useState<TimeReportRow[]>([]);
  const [summary, setSummary] = useState<ApiResponse["summary"]>({
    total: 0,
    draft: 0,
    submitted: 0,
    approved: 0,
    rejected: 0,
    totalHours: 0,
  });

  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [workType, setWorkType] = useState("");
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

  function getSchedule(id?: string | null) {
    return schedules.find((schedule) => schedule.id === id);
  }

  function scheduleLabel(schedule?: ScheduleRow) {
    if (!schedule) return "Ingen schemakoppling";

    const employee = getEmployee(schedule.employee_id);

    return [
      fmtDate(schedule.schedule_date),
      schedule.start_time ? String(schedule.start_time).slice(0, 5) : "",
      schedule.end_time ? String(schedule.end_time).slice(0, 5) : "",
      employeeName(employee),
      schedule.related_assignment,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  async function loadReports() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      if (workType) params.set("work_type", workType);
      if (employeeId) params.set("employee_id", employeeId);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);

      const res = await fetch("/api/admin/personal/tidrapportering?" + params.toString());
      const json: ApiResponse = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta tidrapportering.");
      }

      setEmployees(json.employees || []);
      setSchedules(json.schedules || []);
      setReports(json.reports || []);
      setSummary(
        json.summary || {
          total: 0,
          draft: 0,
          submitted: 0,
          approved: 0,
          rejected: 0,
          totalHours: 0,
        }
      );
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

  async function createReport(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const payload = {
        ...form,
        total_hours:
          form.total_hours || calculateHours(form.start_time, form.end_time, form.break_minutes),
      };

      const res = await fetch("/api/admin/personal/tidrapportering", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara tidrapporten.");
      }

      setMessage("Tidrapporten sparades.");
      setForm((prev) => ({
        ...emptyForm,
        employee_id: prev.employee_id,
        report_date: prev.report_date,
      }));
      setShowForm(false);
      await loadReports();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara tidrapporten.");
    } finally {
      setSaving(false);
    }
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = {
        ...prev,
        [key]: value,
      };

      if (key === "start_time" || key === "end_time" || key === "break_minutes") {
        next.total_hours = calculateHours(
          key === "start_time" ? String(value) : next.start_time,
          key === "end_time" ? String(value) : next.end_time,
          key === "break_minutes" ? String(value) : next.break_minutes
        );
      }

      if (key === "schedule_id") {
        const schedule = schedules.find((item) => item.id === value);

        if (schedule) {
          next.employee_id = schedule.employee_id || next.employee_id;
          next.report_date = schedule.schedule_date ? String(schedule.schedule_date).slice(0, 10) : next.report_date;
          next.start_time = schedule.start_time ? String(schedule.start_time).slice(0, 5) : next.start_time;
          next.end_time = schedule.end_time ? String(schedule.end_time).slice(0, 5) : next.end_time;
          next.related_assignment = schedule.related_assignment || next.related_assignment;
          next.total_hours = calculateHours(next.start_time, next.end_time, next.break_minutes);
        }
      }

      return next;
    });
  }

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTotal = useMemo(() => reports.length, [reports]);

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
                  Tidrapportering
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Registrera arbetstid, rast, körning, avvikelser och koppla tidrapporter till schema eller framtida körorder.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm((value) => !value)}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49]"
                >
                  {showForm ? "Stäng formulär" : "Ny tidrapport"}
                </button>

                <button
                  type="button"
                  onClick={loadReports}
                  className="inline-flex items-center justify-center rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3548]"
                >
                  Uppdatera
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-6">
              <SummaryCard label="Rapporter" value={summary?.total || 0} />
              <SummaryCard label="Timmar" valueText={fmtNumber(summary?.totalHours || 0)} tone="blue" />
              <SummaryCard label="Utkast" value={summary?.draft || 0} tone="amber" />
              <SummaryCard label="Inskickade" value={summary?.submitted || 0} tone="blue" />
              <SummaryCard label="Godkända" value={summary?.approved || 0} tone="green" />
              <SummaryCard label="Avvisade" value={summary?.rejected || 0} tone="red" />
            </div>

            {needsSetup && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800 shadow-sm">
                <h2 className="text-base font-bold">
                  Tidrapporteringstabellen saknas ännu
                </h2>
                <p className="mt-2 text-sm leading-6">
                  Tabellen <strong>staff_time_reports</strong> saknas i databasen. Kör SQL-koden nedan så kan tidrapporter skapas och visas.
                </p>
              </section>
            )}

            {showForm && (
              <form
                onSubmit={createReport}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-2 border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Ny tidrapport
                  </h2>
                  <p className="text-sm text-slate-500">
                    Välj personal, datum, tider, rast, arbete och eventuell koppling till schema.
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

                  <SelectField
                    label="Koppla schema"
                    value={form.schedule_id}
                    onChange={(value) => updateField("schedule_id", value)}
                    options={[
                      ["", "Ingen schemakoppling"],
                      ...schedules.map((schedule) => [
                        schedule.id,
                        scheduleLabel(schedule),
                      ] as [string, string]),
                    ]}
                  />

                  <Field label="Datum" type="date" value={form.report_date} onChange={(value) => updateField("report_date", value)} />
                  <Field label="Starttid" type="time" value={form.start_time} onChange={(value) => updateField("start_time", value)} />
                  <Field label="Sluttid" type="time" value={form.end_time} onChange={(value) => updateField("end_time", value)} />
                  <Field label="Rast minuter" value={form.break_minutes} onChange={(value) => updateField("break_minutes", value)} />
                  <Field label="Totala timmar" value={form.total_hours} onChange={(value) => updateField("total_hours", value)} />

                  <SelectField
                    label="Arbetstyp"
                    value={form.work_type}
                    onChange={(value) => updateField("work_type", value)}
                    options={[
                      ["driving", "Körning"],
                      ["admin", "Administration"],
                      ["cleaning", "Städ / fordonsvård"],
                      ["standby", "Jour / standby"],
                      ["training", "Utbildning"],
                      ["other", "Övrigt"],
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
                      ["rejected", "Avvisad"],
                    ]}
                  />

                  <Field label="Koppling till körning" value={form.related_assignment} onChange={(value) => updateField("related_assignment", value)} placeholder="Ex. körorder/offert/bokning" />
                  <Field label="Km start" value={form.km_start} onChange={(value) => updateField("km_start", value)} />
                  <Field label="Km slut" value={form.km_end} onChange={(value) => updateField("km_end", value)} />
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <TextArea
                    label="Avvikelse"
                    value={form.deviation}
                    onChange={(value) => updateField("deviation", value)}
                    placeholder="Ex. försening, extra tid, ändrad körning..."
                  />

                  <TextArea
                    label="Anteckning"
                    value={form.notes}
                    onChange={(value) => updateField("notes", value)}
                    placeholder="Intern anteckning..."
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
                    {saving ? "Sparar..." : "Spara tidrapport"}
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
                      if (event.key === "Enter") loadReports();
                    }}
                    placeholder="Sök personal, körning, avvikelse eller anteckning..."
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
                  label="Arbetstyp"
                  value={workType}
                  onChange={setWorkType}
                  options={[
                    ["", "Alla"],
                    ["driving", "Körning"],
                    ["admin", "Administration"],
                    ["cleaning", "Städ / fordonsvård"],
                    ["standby", "Jour / standby"],
                    ["training", "Utbildning"],
                    ["other", "Övrigt"],
                  ]}
                />

                <SelectField
                  label="Status"
                  value={status}
                  onChange={setStatus}
                  options={[
                    ["", "Alla"],
                    ["draft", "Utkast"],
                    ["submitted", "Inskickade"],
                    ["approved", "Godkända"],
                    ["rejected", "Avvisade"],
                  ]}
                />

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={loadReports}
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
                    Tidrapporter
                  </h2>
                  <p className="text-sm text-slate-500">
                    Visar {filteredTotal} rapporter
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1280px] w-full border-collapse text-left text-sm">
                  <thead className="bg-[#194C66] text-white">
                    <tr>
                      <Th>Datum</Th>
                      <Th>Personal</Th>
                      <Th>Tid</Th>
                      <Th>Timmar</Th>
                      <Th>Arbete</Th>
                      <Th>Status</Th>
                      <Th>Körning</Th>
                      <Th>Km</Th>
                      <Th>Avvikelse / anteckning</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-8 text-center text-slate-500">
                          Laddar tidrapporter...
                        </td>
                      </tr>
                    ) : reports.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-10 text-center">
                          <div className="mx-auto max-w-lg">
                            <div className="text-base font-bold text-[#194C66]">
                              Inga tidrapporter hittades
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              Skapa första tidrapporten med knappen Ny tidrapport.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      reports.map((report) => {
                        const employee = getEmployee(report.employee_id);

                        return (
                          <tr key={report.id} className="align-top transition hover:bg-slate-50">
                            <Td>
                              <div className="font-bold text-[#194C66]">
                                {fmtDate(report.report_date)}
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
                                {report.start_time || "—"} – {report.end_time || "—"}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                Rast: {report.break_minutes ?? 0} min
                              </div>
                            </Td>

                            <Td>
                              <div className="font-bold text-[#194C66]">
                                {fmtNumber(report.total_hours)} h
                              </div>
                            </Td>

                            <Td>
                              <span className={"inline-flex rounded-full px-3 py-1 text-xs font-semibold " + workTypeClass(report.work_type)}>
                                {workTypeLabel(report.work_type)}
                              </span>
                            </Td>

                            <Td>
                              <span className={"inline-flex rounded-full px-3 py-1 text-xs font-semibold " + statusClass(report.status)}>
                                {statusLabel(report.status)}
                              </span>
                            </Td>

                            <Td>
                              <div className="max-w-[220px] truncate text-slate-700">
                                {report.related_assignment || scheduleLabel(getSchedule(report.schedule_id))}
                              </div>
                            </Td>

                            <Td>
                              <div className="text-slate-700">
                                {report.km_start || report.km_end ? `${report.km_start || "—"} – ${report.km_end || "—"}` : "—"}
                              </div>
                            </Td>

                            <Td>
                              <div className="max-w-[280px] truncate text-slate-600">
                                {report.deviation || report.notes || "—"}
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

function SummaryCard({
  label,
  value,
  valueText,
  tone,
}: {
  label: string;
  value?: number;
  valueText?: string;
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
      <div className="mt-2 text-3xl font-bold">{valueText || value || 0}</div>
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

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={5}
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
