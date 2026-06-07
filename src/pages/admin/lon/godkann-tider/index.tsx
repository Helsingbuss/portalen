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
    approvedHours: number;
  };
  error?: string;
};

const today = new Date().toISOString().slice(0, 10);

function weekStartDate() {
  const d = new Date();
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d.toISOString().slice(0, 10);
}

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

function fmtNumber(value?: number | null) {
  return new Intl.NumberFormat("sv-SE", {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function LonGodkannTiderPage() {
  const [mounted, setMounted] = useState(false);
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
    approvedHours: 0,
  });

  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("submitted");
  const [employeeId, setEmployeeId] = useState("");
  const [dateFrom, setDateFrom] = useState(weekStartDate());
  const [dateTo, setDateTo] = useState(today);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [adminNote, setAdminNote] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function getEmployee(id?: string | null) {
    return employees.find((employee) => employee.id === id);
  }

  function getSchedule(id?: string | null) {
    return schedules.find((schedule) => schedule.id === id);
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function toggleAll() {
    if (selectedIds.length === reports.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(reports.map((report) => report.id));
    }
  }

  async function loadReports() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      if (employeeId) params.set("employee_id", employeeId);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);

      const res = await fetch("/api/admin/lon/godkann-tider?" + params.toString());
      const json: ApiResponse = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta tider.");
      }

      setEmployees(json.employees || []);
      setSchedules(json.schedules || []);
      setReports(json.reports || []);
      setSummary(json.summary || {
        total: 0,
        draft: 0,
        submitted: 0,
        approved: 0,
        rejected: 0,
        totalHours: 0,
        approvedHours: 0,
      });
      setNeedsSetup(Boolean(json.needsSetup));
      setSelectedIds([]);
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function updateSelected(action: "submit" | "approve" | "reject" | "draft") {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (!selectedIds.length) {
        throw new Error("Välj minst en tidrapport först.");
      }

      const res = await fetch("/api/admin/lon/godkann-tider", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: selectedIds,
          action,
          admin_note: adminNote,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte uppdatera tider.");
      }

      setMessage("Uppdaterade " + json.updated + " tidrapport(er).");
      setAdminNote("");
      await loadReports();
    } catch (err: any) {
      setError(err?.message || "Kunde inte uppdatera tider.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    setMounted(true);
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTotal = useMemo(() => reports.length, [reports]);

  if (!mounted) {
    return (
      <>
        <AdminMenu />
        <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
          <Header />
          <main className="px-6 pb-8 pt-10">
            <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
              Laddar godkänn tider...
            </section>
          </main>
        </div>
      </>
    );
  }

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
                  Godkänn tider
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Granska tidrapporter innan de används i lönekörning. Godkända tider blir grunden för nästa steg: Skapa lönekörning.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
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
              <SummaryCard label="Inskickade" value={summary?.submitted || 0} tone="blue" />
              <SummaryCard label="Godkända" value={summary?.approved || 0} tone="green" />
              <SummaryCard label="Godkända timmar" valueText={fmtNumber(summary?.approvedHours || 0)} tone="green" />
              <SummaryCard label="Avvisade" value={summary?.rejected || 0} tone="red" />
            </div>

            {needsSetup && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800 shadow-sm">
                <h2 className="text-base font-bold">
                  Tidrapportering saknas
                </h2>
                <p className="mt-2 text-sm leading-6">
                  Tabellen <strong>staff_time_reports</strong> saknas. Skapa den under Personal → Tidrapportering först.
                </p>
              </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[1fr_240px_180px_180px_180px_140px]">
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

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Intern kommentar vid åtgärd
                  </label>
                  <input
                    value={adminNote}
                    onChange={(event) => setAdminNote(event.target.value)}
                    placeholder="Ex. Godkänd av admin, avvisad p.g.a. saknad information..."
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={saving || selectedIds.length === 0}
                    onClick={() => updateSelected("submit")}
                    className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Markera inskickad
                  </button>

                  <button
                    type="button"
                    disabled={saving || selectedIds.length === 0}
                    onClick={() => updateSelected("approve")}
                    className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Godkänn valda
                  </button>

                  <button
                    type="button"
                    disabled={saving || selectedIds.length === 0}
                    onClick={() => updateSelected("reject")}
                    className="rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Avvisa valda
                  </button>
                </div>
              </div>

              <p className="mt-3 text-sm text-slate-500">
                Valda rapporter: <strong>{selectedIds.length}</strong>
              </p>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Tidrapporter att granska
                  </h2>
                  <p className="text-sm text-slate-500">
                    Visar {filteredTotal} rapporter
                  </p>
                </div>

                <button
                  type="button"
                  onClick={toggleAll}
                  disabled={reports.length === 0}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-[#194C66] transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {selectedIds.length === reports.length && reports.length > 0 ? "Avmarkera alla" : "Välj alla"}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1320px] w-full border-collapse text-left text-sm">
                  <thead className="bg-[#194C66] text-white">
                    <tr>
                      <Th>Välj</Th>
                      <Th>Datum</Th>
                      <Th>Personal</Th>
                      <Th>Tid</Th>
                      <Th>Timmar</Th>
                      <Th>Arbete</Th>
                      <Th>Status</Th>
                      <Th>Körning / schema</Th>
                      <Th>Km</Th>
                      <Th>Avvikelse / anteckning</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={10} className="px-5 py-8 text-center text-slate-500">
                          Laddar tider...
                        </td>
                      </tr>
                    ) : reports.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-5 py-10 text-center">
                          <div className="mx-auto max-w-lg">
                            <div className="text-base font-bold text-[#194C66]">
                              Inga tidrapporter hittades
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              Kontrollera filter eller skapa en tidrapport under Personal → Tidrapportering.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      reports.map((report) => {
                        const employee = getEmployee(report.employee_id);
                        const schedule = getSchedule(report.schedule_id);
                        const selected = selectedIds.includes(report.id);

                        return (
                          <tr key={report.id} className="align-top transition hover:bg-slate-50">
                            <Td>
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleSelected(report.id)}
                                className="h-4 w-4 rounded border-slate-300"
                              />
                            </Td>

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
                              <div className="max-w-[240px] truncate text-slate-700">
                                {report.related_assignment || schedule?.related_assignment || "—"}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {schedule?.location || ""}
                              </div>
                            </Td>

                            <Td>
                              <div className="text-slate-700">
                                {report.km_start || report.km_end ? String(report.km_start || "—") + " – " + String(report.km_end || "—") : "—"}
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
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
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
