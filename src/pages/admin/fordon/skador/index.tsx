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

type IncidentRow = {
  id: string;
  vehicle_id?: string | null;
  incident_date?: string | null;
  incident_type?: string | null;
  location?: string | null;
  reported_by?: string | null;
  title?: string | null;
  description?: string | null;
  action_taken?: string | null;
  cost_amount?: number | null;
  insurance_case?: string | null;
  status?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type ApiResponse = {
  ok: boolean;
  needsSetup?: boolean;
  vehicles?: VehicleRow[];
  incidents?: IncidentRow[];
  summary?: {
    total: number;
    open: number;
    inProgress: number;
    closed: number;
    insurance: number;
    totalCost: number;
  };
  error?: string;
};

type FormState = {
  vehicle_id: string;
  incident_date: string;
  incident_type: string;
  location: string;
  reported_by: string;
  title: string;
  description: string;
  action_taken: string;
  cost_amount: string;
  insurance_case: string;
  status: string;
  notes: string;
};

const emptyForm: FormState = {
  vehicle_id: "",
  incident_date: new Date().toISOString().slice(0, 10),
  incident_type: "damage",
  location: "",
  reported_by: "",
  title: "",
  description: "",
  action_taken: "",
  cost_amount: "",
  insurance_case: "",
  status: "open",
  notes: "",
};

function incidentTypeLabel(type?: string | null) {
  switch (type) {
    case "damage":
      return "Skada";
    case "incident":
      return "Incident";
    case "accident":
      return "Olycka";
    case "deviation":
      return "Avvikelse";
    case "insurance":
      return "Försäkring";
    case "other":
      return "Övrigt";
    default:
      return type || "Händelse";
  }
}

function statusLabel(status?: string | null) {
  switch (status) {
    case "open":
      return "Öppen";
    case "in_progress":
      return "Pågående";
    case "waiting":
      return "Väntar";
    case "closed":
      return "Stängd";
    case "cancelled":
      return "Avbruten";
    default:
      return status || "Ej satt";
  }
}

function statusClass(status?: string | null) {
  switch (status) {
    case "closed":
      return "bg-emerald-100 text-emerald-700";
    case "in_progress":
      return "bg-blue-100 text-blue-700";
    case "waiting":
      return "bg-amber-100 text-amber-700";
    case "open":
      return "bg-red-100 text-red-700";
    case "cancelled":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function typeClass(type?: string | null) {
  switch (type) {
    case "damage":
      return "bg-red-100 text-red-700";
    case "incident":
      return "bg-amber-100 text-amber-700";
    case "accident":
      return "bg-red-100 text-red-700";
    case "deviation":
      return "bg-blue-100 text-blue-700";
    case "insurance":
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

function fmtMoney(value?: number | null) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export default function FordonSkadorPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [summary, setSummary] = useState<ApiResponse["summary"]>({
    total: 0,
    open: 0,
    inProgress: 0,
    closed: 0,
    insurance: 0,
    totalCost: 0,
  });

  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [incidentType, setIncidentType] = useState("");
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

  async function loadIncidents() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      if (incidentType) params.set("incident_type", incidentType);
      if (vehicleId) params.set("vehicle_id", vehicleId);

      const res = await fetch("/api/admin/fordon/skador?" + params.toString());
      const json: ApiResponse = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta skador och incidenter.");
      }

      setVehicles(json.vehicles || []);
      setIncidents(json.incidents || []);
      setSummary(
        json.summary || {
          total: 0,
          open: 0,
          inProgress: 0,
          closed: 0,
          insurance: 0,
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

  async function createIncident(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/fordon/skador", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara händelsen.");
      }

      setMessage("Skada/incident sparades.");
      setForm(emptyForm);
      setShowForm(false);
      await loadIncidents();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara händelsen.");
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
    loadIncidents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTotal = useMemo(() => incidents.length, [incidents]);

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
                  Skador & incidenter
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Här registrerar du skador, incidenter, olyckor, avvikelser och försäkringsärenden kopplade till Helsingbuss egna fordon.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm((value) => !value)}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49]"
                >
                  {showForm ? "Stäng formulär" : "Ny skada/incident"}
                </button>

                <button
                  type="button"
                  onClick={loadIncidents}
                  className="inline-flex items-center justify-center rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3548]"
                >
                  Uppdatera
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-6">
              <SummaryCard label="Totalt" value={summary?.total || 0} />
              <SummaryCard label="Öppna" value={summary?.open || 0} tone="red" />
              <SummaryCard label="Pågående" value={summary?.inProgress || 0} tone="blue" />
              <SummaryCard label="Stängda" value={summary?.closed || 0} tone="green" />
              <SummaryCard label="Försäkring" value={summary?.insurance || 0} tone="amber" />
              <SummaryCard label="Kostnad" valueText={fmtMoney(summary?.totalCost || 0)} tone="slate" />
            </div>

            {needsSetup && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800 shadow-sm">
                <h2 className="text-base font-bold">
                  Skadetabellen saknas ännu
                </h2>
                <p className="mt-2 text-sm leading-6">
                  Tabellen <strong>vehicle_incidents</strong> saknas i databasen. Kör SQL-koden nedan så kan skador och incidenter sparas.
                </p>
              </section>
            )}

            {showForm && (
              <form
                onSubmit={createIncident}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-2 border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Ny skada / incident
                  </h2>
                  <p className="text-sm text-slate-500">
                    Välj fordon och fyll i vad som har hänt, plats, åtgärd, kostnad och eventuell försäkringsinformation.
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

                  <Field
                    label="Datum"
                    type="date"
                    value={form.incident_date}
                    onChange={(value) => updateField("incident_date", value)}
                  />

                  <SelectField
                    label="Typ"
                    value={form.incident_type}
                    onChange={(value) => updateField("incident_type", value)}
                    options={[
                      ["damage", "Skada"],
                      ["incident", "Incident"],
                      ["accident", "Olycka"],
                      ["deviation", "Avvikelse"],
                      ["insurance", "Försäkring"],
                      ["other", "Övrigt"],
                    ]}
                  />

                  <SelectField
                    label="Status"
                    value={form.status}
                    onChange={(value) => updateField("status", value)}
                    options={[
                      ["open", "Öppen"],
                      ["in_progress", "Pågående"],
                      ["waiting", "Väntar"],
                      ["closed", "Stängd"],
                      ["cancelled", "Avbruten"],
                    ]}
                  />

                  <Field
                    label="Rubrik"
                    value={form.title}
                    onChange={(value) => updateField("title", value)}
                    placeholder="Ex. Skada på backspegel"
                  />

                  <Field
                    label="Plats"
                    value={form.location}
                    onChange={(value) => updateField("location", value)}
                    placeholder="Ex. Helsingborg"
                  />

                  <Field
                    label="Rapporterad av"
                    value={form.reported_by}
                    onChange={(value) => updateField("reported_by", value)}
                    placeholder="Namn"
                  />

                  <Field
                    label="Kostnad"
                    value={form.cost_amount}
                    onChange={(value) => updateField("cost_amount", value)}
                    placeholder="Ex. 3500"
                  />

                  <Field
                    label="Försäkringsärende"
                    value={form.insurance_case}
                    onChange={(value) => updateField("insurance_case", value)}
                    placeholder="Ex. Ärendenummer"
                  />
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <TextArea
                    label="Beskrivning"
                    value={form.description}
                    onChange={(value) => updateField("description", value)}
                    placeholder="Beskriv vad som har hänt..."
                  />

                  <TextArea
                    label="Åtgärd"
                    value={form.action_taken}
                    onChange={(value) => updateField("action_taken", value)}
                    placeholder="Vad har gjorts eller vad behöver göras?"
                  />
                </div>

                <div className="mt-4">
                  <TextArea
                    label="Intern anteckning"
                    value={form.notes}
                    onChange={(value) => updateField("notes", value)}
                    placeholder="Övriga interna anteckningar..."
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
                    {saving ? "Sparar..." : "Spara skada/incident"}
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
                      if (event.key === "Enter") loadIncidents();
                    }}
                    placeholder="Sök fordon, rubrik, plats, skada, åtgärd eller försäkringsärende..."
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
                  value={incidentType}
                  onChange={setIncidentType}
                  options={[
                    ["", "Alla"],
                    ["damage", "Skada"],
                    ["incident", "Incident"],
                    ["accident", "Olycka"],
                    ["deviation", "Avvikelse"],
                    ["insurance", "Försäkring"],
                    ["other", "Övrigt"],
                  ]}
                />

                <SelectField
                  label="Status"
                  value={status}
                  onChange={setStatus}
                  options={[
                    ["", "Alla"],
                    ["open", "Öppna"],
                    ["in_progress", "Pågående"],
                    ["waiting", "Väntar"],
                    ["closed", "Stängda"],
                    ["cancelled", "Avbrutna"],
                  ]}
                />

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={loadIncidents}
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
                    Skade- och incidentlogg
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
                      <Th>Rubrik</Th>
                      <Th>Typ</Th>
                      <Th>Status</Th>
                      <Th>Plats</Th>
                      <Th>Kostnad</Th>
                      <Th>Försäkring</Th>
                      <Th>Åtgärd</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-8 text-center text-slate-500">
                          Laddar skador och incidenter...
                        </td>
                      </tr>
                    ) : incidents.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-10 text-center">
                          <div className="mx-auto max-w-lg">
                            <div className="text-base font-bold text-[#194C66]">
                              Inga skador eller incidenter hittades
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              Skapa första posten med knappen Ny skada/incident.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      incidents.map((incident) => (
                        <tr key={incident.id} onClick={() => router.push("/admin/fordon/skador/" + encodeURIComponent(incident.id))} className="cursor-pointer align-top transition hover:bg-slate-50">
                          <Td>
                            <div className="font-bold text-[#194C66]">
                              {fmtDate(incident.incident_date)}
                            </div>
                          </Td>

                          <Td>
                            <div className="max-w-[240px] truncate font-semibold text-slate-900">
                              {vehicleName(incident.vehicle_id)}
                            </div>
                          </Td>

                          <Td>
                            <div className="max-w-[240px] truncate font-bold text-[#194C66]">
                              {incident.title || "Skada/incident"}
                            </div>
                            <div className="mt-1 max-w-[240px] truncate text-xs text-slate-500">
                              {incident.description || "—"}
                            </div>
                          </Td>

                          <Td>
                            <span
                              className={
                                "inline-flex rounded-full px-3 py-1 text-xs font-semibold " +
                                typeClass(incident.incident_type)
                              }
                            >
                              {incidentTypeLabel(incident.incident_type)}
                            </span>
                          </Td>

                          <Td>
                            <span
                              className={
                                "inline-flex rounded-full px-3 py-1 text-xs font-semibold " +
                                statusClass(incident.status)
                              }
                            >
                              {statusLabel(incident.status)}
                            </span>
                          </Td>

                          <Td>
                            <div className="max-w-[180px] truncate text-slate-700">
                              {incident.location || "—"}
                            </div>
                          </Td>

                          <Td>
                            <div className="font-semibold text-slate-900">
                              {fmtMoney(incident.cost_amount)}
                            </div>
                          </Td>

                          <Td>
                            <div className="max-w-[180px] truncate text-slate-700">
                              {incident.insurance_case || "—"}
                            </div>
                          </Td>

                          <Td>
                            <div className="max-w-[240px] truncate text-slate-600">
                              {incident.action_taken || incident.notes || "—"}
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
      <div className="mt-2 text-2xl font-bold">{valueText || value || 0}</div>
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
