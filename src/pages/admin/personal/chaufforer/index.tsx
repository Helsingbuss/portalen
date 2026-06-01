import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
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
  city?: string | null;
  driver_license?: string | null;
  ykb_expiry_date?: string | null;
  driver_card_expiry_date?: string | null;
  notes?: string | null;
};

function fullName(employee: EmployeeRow) {
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
      return role || "Anställd";
  }
}

function employmentTypeLabel(type?: string | null) {
  switch (type) {
    case "full_time":
      return "Heltid";
    case "part_time":
      return "Deltid";
    case "hourly":
      return "Timanställd";
    case "consultant":
      return "Konsult";
    default:
      return type || "Ej satt";
  }
}

function statusLabel(status?: string | null) {
  switch (status) {
    case "active":
      return "Aktiv";
    case "inactive":
      return "Inaktiv";
    case "pending":
      return "På gång";
    case "ended":
      return "Avslutad";
    default:
      return status || "Ej satt";
  }
}

function statusClass(status?: string | null) {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-700";
    case "pending":
      return "bg-amber-100 text-amber-700";
    case "inactive":
    case "ended":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function roleClass(role?: string | null) {
  switch (role) {
    case "driver":
      return "bg-[#eef8fb] text-[#194C66]";
    case "traffic_manager":
      return "bg-blue-100 text-blue-700";
    case "booking_agent":
      return "bg-purple-100 text-purple-700";
    case "admin":
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

function isExpiringSoon(value?: string | null) {
  if (!value) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const in60Days = new Date(today);
  in60Days.setDate(in60Days.getDate() + 60);

  const date = new Date(value);
  date.setHours(0, 0, 0, 0);

  return date >= today && date <= in60Days;
}


type ApiResponse = {
  ok: boolean;
  needsSetup?: boolean;
  employees?: EmployeeRow[];
  summary?: {
    total: number;
    active: number;
    drivers: number;
    hourly: number;
    inactive: number;
  };
  error?: string;
};

export default function PersonalChaufforerPage() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [summary, setSummary] = useState<ApiResponse["summary"]>({
    total: 0,
    active: 0,
    drivers: 0,
    hourly: 0,
    inactive: 0,
  });

  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("driver");
  const [error, setError] = useState("");

  async function loadEmployees() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      if (role) params.set("role", role);

      const res = await fetch("/api/admin/personal/anstallda?" + params.toString());
      const json: ApiResponse = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta anställda.");
      }

      setEmployees(json.employees || []);
      setSummary(json.summary || { total: 0, active: 0, drivers: 0, hourly: 0, inactive: 0 });
      setNeedsSetup(Boolean(json.needsSetup));
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTotal = useMemo(() => employees.length, [employees]);

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
                  Chaufförer
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Här visas personal med rollen Chaufför, inklusive körkort, YKB, förarkort och viktiga giltighetsdatum.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/admin/personal/anstallda/skapa"
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49]"
                >
                  Lägg till anställd
                </Link>

                <button
                  type="button"
                  onClick={loadEmployees}
                  className="inline-flex items-center justify-center rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3548]"
                >
                  Uppdatera
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-5">
              <SummaryCard label="Totalt" value={summary?.total || 0} />
              <SummaryCard label="Aktiva" value={summary?.active || 0} tone="green" />
              <SummaryCard label="Chaufförer" value={summary?.drivers || 0} tone="blue" />
              <SummaryCard label="Timanställda" value={summary?.hourly || 0} tone="amber" />
              <SummaryCard label="Inaktiva" value={summary?.inactive || 0} tone="slate" />
            </div>

            {needsSetup && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800 shadow-sm">
                <h2 className="text-base font-bold">
                  Personaltabellen saknas ännu
                </h2>
                <p className="mt-2 text-sm leading-6">
                  Tabellen <strong>staff_employees</strong> saknas i databasen. Kör SQL-koden nedan så kan anställda skapas och visas.
                </p>
              </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[1fr_220px_220px_140px]">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Sök
                  </label>
                  <input
                    value={q}
                    onChange={(event) => setQ(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") loadEmployees();
                    }}
                    placeholder="Sök namn, telefon, e-post, roll eller ort..."
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                  />
                </div>

                <SelectField
                  label="Roll"
                  value={role}
                  onChange={setRole}
                  options={[
                    ["", "Alla roller"],
                    ["driver", "Chaufför"],
                    ["traffic_manager", "Trafikledare"],
                    ["booking_agent", "Bokningsagent"],
                    ["admin", "Administratör"],
                    ["employee", "Anställd"],
                  ]}
                />

                <SelectField
                  label="Status"
                  value={status}
                  onChange={setStatus}
                  options={[
                    ["", "Alla"],
                    ["active", "Aktiva"],
                    ["pending", "På gång"],
                    ["inactive", "Inaktiva"],
                    ["ended", "Avslutade"],
                  ]}
                />

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={loadEmployees}
                    className="w-full rounded-xl bg-[#00645d] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#004f49]"
                  >
                    Filtrera
                  </button>
                </div>
              </div>

              {error && (
                <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Chaufförsregister
                  </h2>
                  <p className="text-sm text-slate-500">
                    Visar {filteredTotal} personer
                  </p>
                </div>
              </div>

              <EmployeeTable employees={employees} loading={loading} />
            </section>
          </div>
        </main>
      </div>
    </>
  );
}

function EmployeeTable({
  employees,
  loading,
}: {
  employees: EmployeeRow[];
  loading: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1180px] w-full border-collapse text-left text-sm">
        <thead className="bg-[#194C66] text-white">
          <tr>
            <Th>Namn</Th>
            <Th>Roll</Th>
            <Th>Anställning</Th>
            <Th>Kontakt</Th>
            <Th>Ort</Th>
            <Th>Körkort/YKB</Th>
            <Th>Status</Th>
            <Th>Anteckning</Th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {loading ? (
            <tr>
              <td colSpan={8} className="px-5 py-8 text-center text-slate-500">
                Laddar personal...
              </td>
            </tr>
          ) : employees.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-5 py-10 text-center">
                <div className="mx-auto max-w-lg">
                  <div className="text-base font-bold text-[#194C66]">
                    Inga anställda hittades
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Lägg till första anställda med knappen Lägg till anställd.
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            employees.map((employee) => (
              <tr key={employee.id} onClick={() => { window.location.href = "/admin/personal/anstallda/" + encodeURIComponent(employee.id); }} className="cursor-pointer align-top transition hover:bg-slate-50">
                <Td>
                  <div className="font-bold text-[#194C66]">
                    {fullName(employee)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {employee.email || "E-post saknas"}
                  </div>
                </Td>

                <Td>
                  <span className={"inline-flex rounded-full px-3 py-1 text-xs font-semibold " + roleClass(employee.role)}>
                    {roleLabel(employee.role)}
                  </span>
                </Td>

                <Td>{employmentTypeLabel(employee.employment_type)}</Td>

                <Td>
                  <div className="text-slate-700">{employee.phone || "—"}</div>
                </Td>

                <Td>{employee.city || "—"}</Td>

                <Td>
                  <div className="text-slate-700">
                    {employee.driver_license || "—"}
                  </div>
                  {employee.ykb_expiry_date && (
                    <div className={"mt-1 text-xs font-semibold " + (isExpiringSoon(employee.ykb_expiry_date) ? "text-amber-700" : "text-slate-500")}>
                      YKB: {fmtDate(employee.ykb_expiry_date)}
                    </div>
                  )}
                </Td>

                <Td>
                  <span className={"inline-flex rounded-full px-3 py-1 text-xs font-semibold " + statusClass(employee.status)}>
                    {statusLabel(employee.status)}
                  </span>
                </Td>

                <Td>
                  <div className="max-w-[260px] truncate text-slate-600">
                    {employee.notes || "—"}
                  </div>
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
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
