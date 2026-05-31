import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type VehicleRow = {
  id: string;
  vehicle_code?: string | null;
  registration_number?: string | null;
  model?: string | null;
  vehicle_type?: string | null;
};

type ServiceRecordRow = {
  id: string;
  vehicle_id?: string | null;
  record_type?: string | null;
  service_date?: string | null;
  odometer_km?: number | null;
  workshop?: string | null;
  cost_amount?: number | null;
  status?: string | null;
  next_service_date?: string | null;
  next_service_km?: number | null;
  notes?: string | null;
  created_at?: string | null;
};

type ApiResponse = {
  ok: boolean;
  needsSetup?: boolean;
  vehicles?: VehicleRow[];
  records?: ServiceRecordRow[];
  summary?: {
    total: number;
    planned: number;
    completed: number;
    inspections: number;
    overdue: number;
    totalCost: number;
  };
  error?: string;
};

type FormState = {
  vehicle_id: string;
  record_type: string;
  service_date: string;
  odometer_km: string;
  workshop: string;
  cost_amount: string;
  status: string;
  next_service_date: string;
  next_service_km: string;
  notes: string;
};

const emptyForm: FormState = {
  vehicle_id: "",
  record_type: "service",
  service_date: new Date().toISOString().slice(0, 10),
  odometer_km: "",
  workshop: "",
  cost_amount: "",
  status: "planned",
  next_service_date: "",
  next_service_km: "",
  notes: "",
};

function recordTypeLabel(type?: string | null) {
  switch (type) {
    case "service":
      return "Service";
    case "inspection":
      return "Besiktning";
    case "repair":
      return "Reparation";
    case "tires":
      return "Däck";
    case "maintenance":
      return "Underhåll";
    case "other":
      return "Övrigt";
    default:
      return type || "Service";
  }
}

function statusLabel(status?: string | null) {
  switch (status) {
    case "planned":
      return "Planerad";
    case "booked":
      return "Bokad";
    case "completed":
      return "Utförd";
    case "overdue":
      return "Försenad";
    case "cancelled":
      return "Avbruten";
    default:
      return status || "Ej satt";
  }
}

function statusClass(status?: string | null) {
  switch (status) {
    case "completed":
      return "bg-emerald-100 text-emerald-700";
    case "planned":
    case "booked":
      return "bg-blue-100 text-blue-700";
    case "overdue":
      return "bg-red-100 text-red-700";
    case "cancelled":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function typeClass(type?: string | null) {
  switch (type) {
    case "inspection":
      return "bg-amber-100 text-amber-700";
    case "repair":
      return "bg-red-100 text-red-700";
    case "service":
      return "bg-[#eef8fb] text-[#194C66]";
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
  return new Intl.NumberFormat("sv-SE").format(Number(value || 0));
}

function fmtMoney(value?: number | null) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function isOverdue(record: ServiceRecordRow) {
  if (!record.service_date) return false;
  if (record.status === "completed" || record.status === "cancelled") return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const date = new Date(record.service_date);
  date.setHours(0, 0, 0, 0);

  return date < today;
}

export default function FordonServicePage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [records, setRecords] = useState<ServiceRecordRow[]>([]);
  const [summary, setSummary] = useState<ApiResponse["summary"]>({
    total: 0,
    planned: 0,
    completed: 0,
    inspections: 0,
    overdue: 0,
    totalCost: 0,
  });

  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [recordType, setRecordType] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function vehicleName(id?: string | null) {
    const vehicle = vehicles.find((item) => item.id === id);

    if (!vehicle) return "—";

    return [
      vehicle.vehicle_code,
      vehicle.registration_number,
      vehicle.model,
    ]
      .filter(Boolean)
      .join(" · ") || "Fordon";
  }

  async function loadRecords() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      if (recordType) params.set("record_type", recordType);
      if (vehicleId) params.set("vehicle_id", vehicleId);

      const res = await fetch("/api/admin/fordon/service?" + params.toString());
      const json: ApiResponse = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta service och besiktning.");
      }

      setVehicles(json.vehicles || []);
      setRecords(json.records || []);
      setSummary(
        json.summary || {
          total: 0,
          planned: 0,
          completed: 0,
          inspections: 0,
          overdue: 0,
          totalCost: 0,
        }
      );
      setNeedsSetup(Boolean(json.needsSetup));
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function createRecord(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/fordon/service", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara serviceposten.");
      }

      setMessage("Service-/besiktningsposten sparades.");
      setForm(emptyForm);
      setShowForm(false);
      await loadRecords();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara serviceposten.");
    } finally {
      setSaving(false);
    }
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  useEffect(() => {
    loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTotal = useMemo(() => records.length, [records]);

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
                  Fordon & dokument
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  Service & besiktning
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Här hanterar du servicehistorik, besiktning, reparationer, verkstad, kostnader och nästa service för Helsingbuss egna fordon.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm((value) => !value)}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49]"
                >
                  {showForm ? "Stäng formulär" : "Ny servicepost"}
                </button>

                <button
                  type="button"
                  onClick={loadRecords}
                  className="inline-flex items-center justify-center rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3548]"
                >
                  Uppdatera
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-6">
              <SummaryCard label="Totalt" value={summary?.total || 0} />
              <SummaryCard label="Planerade" value={summary?.planned || 0} tone="blue" />
              <SummaryCard label="Utförda" value={summary?.completed || 0} tone="green" />
              <SummaryCard label="Besiktningar" value={summary?.inspections || 0} tone="amber" />
              <SummaryCard label="Försenade" value={summary?.overdue || 0} tone="red" />
              <SummaryCard label="Kostnad" valueText={fmtMoney(summary?.totalCost || 0)} tone="slate" />
            </div>

            {needsSetup && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800 shadow-sm">
                <h2 className="text-base font-bold">
                  Servicetabellen saknas ännu
                </h2>
                <p className="mt-2 text-sm leading-6">
                  Tabellen <strong>vehicle_service_records</strong> saknas i databasen. Kör SQL-koden nedan så kan service och besiktningar sparas.
                </p>
              </section>
            )}

            {showForm && (
              <form
                onSubmit={createRecord}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-2 border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Ny service-/besiktningspost
                  </h2>
                  <p className="text-sm text-slate-500">
                    Välj fordon, typ av åtgärd, datum, mätarställning, verkstad och kostnad.
                  </p>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-4">
                  <SelectField
                    label="Fordon"
                    value={form.vehicle_id}
                    onChange={(value) => updateField("vehicle_id", value)}
                    options={[
                      ["", "Välj fordon"],
                      ...vehicles.map((vehicle) => [
                        vehicle.id,
                        [vehicle.vehicle_code, vehicle.registration_number, vehicle.model].filter(Boolean).join(" · ") || "Fordon",
                      ] as [string, string]),
                    ]}
                  />

                  <SelectField
                    label="Typ"
                    value={form.record_type}
                    onChange={(value) => updateField("record_type", value)}
                    options={[
                      ["service", "Service"],
                      ["inspection", "Besiktning"],
                      ["repair", "Reparation"],
                      ["tires", "Däck"],
                      ["maintenance", "Underhåll"],
                      ["other", "Övrigt"],
                    ]}
                  />

                  <Field
                    label="Datum"
                    type="date"
                    value={form.service_date}
                    onChange={(value) => updateField("service_date", value)}
                  />

                  <SelectField
                    label="Status"
                    value={form.status}
                    onChange={(value) => updateField("status", value)}
                    options={[
                      ["planned", "Planerad"],
                      ["booked", "Bokad"],
                      ["completed", "Utförd"],
                      ["overdue", "Försenad"],
                      ["cancelled", "Avbruten"],
                    ]}
                  />

                  <Field
                    label="Mätarställning km"
                    value={form.odometer_km}
                    onChange={(value) => updateField("odometer_km", value)}
                    placeholder="125000"
                  />

                  <Field
                    label="Verkstad / leverantör"
                    value={form.workshop}
                    onChange={(value) => updateField("workshop", value)}
                    placeholder="Ex. Mercedes-Benz"
                  />

                  <Field
                    label="Kostnad"
                    value={form.cost_amount}
                    onChange={(value) => updateField("cost_amount", value)}
                    placeholder="Ex. 12500"
                  />

                  <Field
                    label="Nästa service datum"
                    type="date"
                    value={form.next_service_date}
                    onChange={(value) => updateField("next_service_date", value)}
                  />

                  <Field
                    label="Nästa service km"
                    value={form.next_service_km}
                    onChange={(value) => updateField("next_service_km", value)}
                    placeholder="135000"
                  />
                </div>

                <div className="mt-4">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Anteckningar
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    rows={4}
                    placeholder="Ex. vad som utförts, kommande åtgärder, reservdelar, besiktningsanmärkningar..."
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
                    {saving ? "Sparar..." : "Spara servicepost"}
                  </button>
                </div>
              </form>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[1fr_280px_200px_200px_140px]">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Sök
                  </label>
                  <input
                    value={q}
                    onChange={(event) => setQ(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") loadRecords();
                    }}
                    placeholder="Sök fordon, verkstad, datum, anteckning eller typ..."
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                  />
                </div>

                <SelectField
                  label="Fordon"
                  value={vehicleId}
                  onChange={setVehicleId}
                  options={[
                    ["", "Alla fordon"],
                    ...vehicles.map((vehicle) => [
                      vehicle.id,
                      [vehicle.vehicle_code, vehicle.registration_number, vehicle.model].filter(Boolean).join(" · ") || "Fordon",
                    ] as [string, string]),
                  ]}
                />

                <SelectField
                  label="Typ"
                  value={recordType}
                  onChange={setRecordType}
                  options={[
                    ["", "Alla"],
                    ["service", "Service"],
                    ["inspection", "Besiktning"],
                    ["repair", "Reparation"],
                    ["tires", "Däck"],
                    ["maintenance", "Underhåll"],
                    ["other", "Övrigt"],
                  ]}
                />

                <SelectField
                  label="Status"
                  value={status}
                  onChange={setStatus}
                  options={[
                    ["", "Alla"],
                    ["planned", "Planerade"],
                    ["booked", "Bokade"],
                    ["completed", "Utförda"],
                    ["overdue", "Försenade"],
                    ["cancelled", "Avbrutna"],
                  ]}
                />

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={loadRecords}
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
                    Servicehistorik
                  </h2>
                  <p className="text-sm text-slate-500">
                    Visar {filteredTotal} poster
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1240px] w-full border-collapse text-left text-sm">
                  <thead className="bg-[#194C66] text-white">
                    <tr>
                      <Th>Datum</Th>
                      <Th>Fordon</Th>
                      <Th>Typ</Th>
                      <Th>Status</Th>
                      <Th>Mätare</Th>
                      <Th>Verkstad</Th>
                      <Th>Kostnad</Th>
                      <Th>Nästa service</Th>
                      <Th>Anteckning</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-8 text-center text-slate-500">
                          Laddar service och besiktning...
                        </td>
                      </tr>
                    ) : records.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-10 text-center">
                          <div className="mx-auto max-w-lg">
                            <div className="text-base font-bold text-[#194C66]">
                              Inga serviceposter hittades
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              Skapa första posten med knappen Ny servicepost.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      records.map((record) => (
                        <tr key={record.id} onClick={() => router.push("/admin/fordon/service/" + encodeURIComponent(record.id))} className="cursor-pointer align-top transition hover:bg-slate-50">
                          <Td>
                            <div className={"font-bold " + (isOverdue(record) ? "text-red-700" : "text-[#194C66]")}>
                              {fmtDate(record.service_date)}
                            </div>
                            {isOverdue(record) && (
                              <div className="mt-1 text-xs font-semibold text-red-600">
                                Försenad
                              </div>
                            )}
                          </Td>

                          <Td>
                            <div className="max-w-[260px] truncate font-semibold text-slate-900">
                              {vehicleName(record.vehicle_id)}
                            </div>
                          </Td>

                          <Td>
                            <span
                              className={
                                "inline-flex rounded-full px-3 py-1 text-xs font-semibold " +
                                typeClass(record.record_type)
                              }
                            >
                              {recordTypeLabel(record.record_type)}
                            </span>
                          </Td>

                          <Td>
                            <span
                              className={
                                "inline-flex rounded-full px-3 py-1 text-xs font-semibold " +
                                statusClass(record.status)
                              }
                            >
                              {statusLabel(record.status)}
                            </span>
                          </Td>

                          <Td>
                            <div className="font-semibold text-slate-900">
                              {fmtNumber(record.odometer_km)} km
                            </div>
                          </Td>

                          <Td>
                            <div className="max-w-[220px] truncate text-slate-700">
                              {record.workshop || "—"}
                            </div>
                          </Td>

                          <Td>
                            <div className="font-semibold text-slate-900">
                              {fmtMoney(record.cost_amount)}
                            </div>
                          </Td>

                          <Td>
                            <div className="text-slate-700">
                              {record.next_service_date ? fmtDate(record.next_service_date) : "—"}
                            </div>
                            {record.next_service_km ? (
                              <div className="mt-1 text-xs text-slate-500">
                                {fmtNumber(record.next_service_km)} km
                              </div>
                            ) : null}
                          </Td>

                          <Td>
                            <div className="max-w-[260px] truncate text-slate-600">
                              {record.notes || "—"}
                            </div>
                          </Td>
                        </tr>
                      ))
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
      <div className="mt-2 text-2xl font-bold">{valueText || fmtNumber(value || 0)}</div>
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
