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

function fmtNumber(value?: string | number | null) {
  return new Intl.NumberFormat("sv-SE").format(Number(value || 0));
}

function fmtMoney(value?: string | number | null) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
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

function isOverdue(form: FormState) {
  if (!form.service_date) return false;
  if (form.status === "completed" || form.status === "cancelled") return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const date = new Date(form.service_date);
  date.setHours(0, 0, 0, 0);

  return date < today;
}

export default function FordonServiceDetailPage() {
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

  async function loadRecord() {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/fordon/service/" + encodeURIComponent(id));
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta serviceposten.");
      }

      const record = json.record || {};

      setVehicles(json.vehicles || []);
      setCreatedAt(record.created_at || "");
      setUpdatedAt(record.updated_at || "");

      setForm({
        vehicle_id: record.vehicle_id || "",
        record_type: record.record_type || "service",
        service_date: record.service_date ? String(record.service_date).slice(0, 10) : "",
        odometer_km:
          record.odometer_km !== null && record.odometer_km !== undefined
            ? String(record.odometer_km)
            : "",
        workshop: record.workshop || "",
        cost_amount:
          record.cost_amount !== null && record.cost_amount !== undefined
            ? String(record.cost_amount)
            : "",
        status: record.status || "planned",
        next_service_date: record.next_service_date ? String(record.next_service_date).slice(0, 10) : "",
        next_service_km:
          record.next_service_km !== null && record.next_service_km !== undefined
            ? String(record.next_service_km)
            : "",
        notes: record.notes || "",
      });
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function saveRecord(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/fordon/service/" + encodeURIComponent(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara serviceposten.");
      }

      setMessage("Serviceposten sparades.");
      await loadRecord();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara serviceposten.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadRecord();
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
                  Service & besiktning
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  {selectedVehicleName()}
                  {updatedAt ? " · Uppdaterad " + new Date(updatedAt).toLocaleString("sv-SE") : ""}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/admin/fordon/service"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Tillbaka
                </Link>

                <button
                  type="submit"
                  form="vehicle-service-edit-form"
                  disabled={saving || loading}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Sparar..." : "Spara servicepost"}
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
                Laddar servicepost...
              </section>
            ) : (
              <form id="vehicle-service-edit-form" onSubmit={saveRecord} className="space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {recordTypeLabel(form.record_type)}
                      </div>

                      <h2 className="mt-2 text-2xl font-bold text-[#194C66]">
                        {selectedVehicleName()}
                      </h2>

                      <p className="mt-2 text-sm text-slate-600">
                        {fmtDate(form.service_date)} · {form.workshop || "Verkstad saknas"} · {fmtMoney(form.cost_amount)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={
                          "inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold " +
                          typeClass(form.record_type)
                        }
                      >
                        {recordTypeLabel(form.record_type)}
                      </span>

                      <span
                        className={
                          "inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold " +
                          (isOverdue(form) ? "bg-red-100 text-red-700" : statusClass(form.status))
                        }
                      >
                        {isOverdue(form) ? "Försenad" : statusLabel(form.status)}
                      </span>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Serviceuppgifter
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
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Anteckningar
                  </h2>

                  <textarea
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    rows={8}
                    placeholder="Ex. vad som utförts, kommande åtgärder, reservdelar, besiktningsanmärkningar..."
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
                    href="/admin/fordon/service"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                  >
                    Avbryt
                  </Link>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Sparar..." : "Spara servicepost"}
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
