import { useEffect, useState } from "react";
import Link from "next/link";
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

function vehicleLabel(vehicle?: VehicleRow) {
  if (!vehicle) return "—";

  return [
    vehicle.vehicle_code,
    vehicle.registration_number,
    vehicle.model,
  ]
    .filter(Boolean)
    .join(" · ") || "Fordon";
}

function fmtMoney(value?: string | number | null) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export default function FordonSkadorDetailPage() {
  const router = useRouter();
  const id = String(router.query.id || "");

  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [createdAt, setCreatedAt] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function selectedVehicleName() {
    return vehicleLabel(vehicles.find((vehicle) => vehicle.id === form.vehicle_id));
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function loadIncident() {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/fordon/skador/" + encodeURIComponent(id));
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta skadan/incidenten.");
      }

      const incident = json.incident || {};

      setVehicles(json.vehicles || []);
      setCreatedAt(incident.created_at || "");
      setUpdatedAt(incident.updated_at || "");

      setForm({
        vehicle_id: incident.vehicle_id || "",
        incident_date: incident.incident_date ? String(incident.incident_date).slice(0, 10) : "",
        incident_type: incident.incident_type || "damage",
        location: incident.location || "",
        reported_by: incident.reported_by || "",
        title: incident.title || "",
        description: incident.description || "",
        action_taken: incident.action_taken || "",
        cost_amount:
          incident.cost_amount !== null && incident.cost_amount !== undefined
            ? String(incident.cost_amount)
            : "",
        insurance_case: incident.insurance_case || "",
        status: incident.status || "open",
        notes: incident.notes || "",
      });
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function saveIncident(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/fordon/skador/" + encodeURIComponent(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara skadan/incidenten.");
      }

      setMessage("Skadan/incidenten sparades.");
      await loadIncident();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara skadan/incidenten.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadIncident();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
                  {loading ? "Skada / incident" : form.title || "Skada / incident"}
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  {selectedVehicleName()}
                  {updatedAt ? " · Uppdaterad " + new Date(updatedAt).toLocaleString("sv-SE") : ""}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/admin/fordon/skador"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Tillbaka
                </Link>

                <button
                  type="submit"
                  form="vehicle-incident-edit-form"
                  disabled={saving || loading}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Sparar..." : "Spara skada/incident"}
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
                Laddar skada/incident...
              </section>
            ) : (
              <form id="vehicle-incident-edit-form" onSubmit={saveIncident} className="space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {incidentTypeLabel(form.incident_type)}
                      </div>

                      <h2 className="mt-2 text-2xl font-bold text-[#194C66]">
                        {form.title || "Skada / incident"}
                      </h2>

                      <p className="mt-2 text-sm text-slate-600">
                        {selectedVehicleName()} · {form.location || "Plats saknas"} · {fmtMoney(form.cost_amount)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={
                          "inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold " +
                          typeClass(form.incident_type)
                        }
                      >
                        {incidentTypeLabel(form.incident_type)}
                      </span>

                      <span
                        className={
                          "inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold " +
                          statusClass(form.status)
                        }
                      >
                        {statusLabel(form.status)}
                      </span>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Händelseuppgifter
                  </h2>

                  <div className="mt-5 grid gap-4 lg:grid-cols-4">
                    <SelectField
                      label="Fordon"
                      value={form.vehicle_id}
                      onChange={(value) => updateField("vehicle_id", value)}
                      options={[
                        ["", "Välj fordon"],
                        ...vehicles.map((vehicle) => [vehicle.id, vehicleLabel(vehicle)] as [string, string]),
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
                    />

                    <Field
                      label="Plats"
                      value={form.location}
                      onChange={(value) => updateField("location", value)}
                    />

                    <Field
                      label="Rapporterad av"
                      value={form.reported_by}
                      onChange={(value) => updateField("reported_by", value)}
                    />

                    <Field
                      label="Kostnad"
                      value={form.cost_amount}
                      onChange={(value) => updateField("cost_amount", value)}
                    />

                    <Field
                      label="Försäkringsärende"
                      value={form.insurance_case}
                      onChange={(value) => updateField("insurance_case", value)}
                    />
                  </div>
                </section>

                <section className="grid gap-6 lg:grid-cols-2">
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
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Intern anteckning
                  </h2>

                  <textarea
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    rows={7}
                    placeholder="Övriga interna anteckningar..."
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

                <div className="flex justify-end gap-3">
                  <Link
                    href="/admin/fordon/skador"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                  >
                    Avbryt
                  </Link>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Sparar..." : "Spara skada/incident"}
                  </button>
                </div>
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
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <label className="text-lg font-bold text-[#194C66]">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={8}
        className="mt-5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
      />
    </section>
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
