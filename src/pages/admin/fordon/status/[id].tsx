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
  check_date: string;
  checked_by: string;
  odometer_km: string;
  fuel_level: string;
  cleanliness_status: string;
  exterior_ok: boolean;
  interior_ok: boolean;
  tires_ok: boolean;
  lights_ok: boolean;
  belts_ok: boolean;
  wc_ok: boolean;
  documents_ok: boolean;
  damage_notes: string;
  status: string;
  notes: string;
};

const emptyForm: FormState = {
  vehicle_id: "",
  check_date: new Date().toISOString().slice(0, 10),
  checked_by: "",
  odometer_km: "",
  fuel_level: "ok",
  cleanliness_status: "ok",
  exterior_ok: true,
  interior_ok: true,
  tires_ok: true,
  lights_ok: true,
  belts_ok: true,
  wc_ok: true,
  documents_ok: true,
  damage_notes: "",
  status: "approved",
  notes: "",
};

function statusLabel(status?: string | null) {
  switch (status) {
    case "approved":
      return "Godkänd";
    case "needs_action":
      return "Åtgärd krävs";
    case "blocked":
      return "Får ej köras";
    case "draft":
      return "Utkast";
    default:
      return status || "Ej satt";
  }
}

function statusClass(status?: string | null) {
  switch (status) {
    case "approved":
      return "bg-emerald-100 text-emerald-700";
    case "needs_action":
      return "bg-amber-100 text-amber-700";
    case "blocked":
      return "bg-red-100 text-red-700";
    case "draft":
      return "bg-slate-100 text-slate-700";
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

export default function FordonStatusDetailPage() {
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

  async function loadCheck() {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/fordon/status/" + encodeURIComponent(id));
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta fordonskontrollen.");
      }

      const check = json.check || {};

      setVehicles(json.vehicles || []);
      setCreatedAt(check.created_at || "");
      setUpdatedAt(check.updated_at || "");

      setForm({
        vehicle_id: check.vehicle_id || "",
        check_date: check.check_date ? String(check.check_date).slice(0, 10) : "",
        checked_by: check.checked_by || "",
        odometer_km:
          check.odometer_km !== null && check.odometer_km !== undefined
            ? String(check.odometer_km)
            : "",
        fuel_level: check.fuel_level || "ok",
        cleanliness_status: check.cleanliness_status || "ok",
        exterior_ok: check.exterior_ok !== false,
        interior_ok: check.interior_ok !== false,
        tires_ok: check.tires_ok !== false,
        lights_ok: check.lights_ok !== false,
        belts_ok: check.belts_ok !== false,
        wc_ok: check.wc_ok !== false,
        documents_ok: check.documents_ok !== false,
        damage_notes: check.damage_notes || "",
        status: check.status || "approved",
        notes: check.notes || "",
      });
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function saveCheck(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/fordon/status/" + encodeURIComponent(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara fordonskontrollen.");
      }

      setMessage("Fordonskontrollen sparades.");
      await loadCheck();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara fordonskontrollen.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadCheck();
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
                  Fordonskontroll
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  {selectedVehicleName()}
                  {createdAt ? " · Skapad " + new Date(createdAt).toLocaleString("sv-SE") : ""}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/admin/fordon/status"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Tillbaka
                </Link>

                <button
                  type="submit"
                  form="vehicle-check-edit-form"
                  disabled={saving || loading}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Sparar..." : "Spara kontroll"}
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
                Laddar fordonskontroll...
              </section>
            ) : (
              <form id="vehicle-check-edit-form" onSubmit={saveCheck} className="space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Daglig fordonskontroll
                      </div>

                      <h2 className="mt-2 text-2xl font-bold text-[#194C66]">
                        {selectedVehicleName()}
                      </h2>

                      <p className="mt-2 text-sm text-slate-600">
                        {form.check_date || "Datum saknas"} · {form.checked_by || "Kontrollant saknas"}
                      </p>
                    </div>

                    <span
                      className={
                        "inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold " +
                        statusClass(form.status)
                      }
                    >
                      {statusLabel(form.status)}
                    </span>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Kontrolluppgifter
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
                      value={form.check_date}
                      onChange={(value) => updateField("check_date", value)}
                    />

                    <Field
                      label="Kontrollerad av"
                      value={form.checked_by}
                      onChange={(value) => updateField("checked_by", value)}
                    />

                    <Field
                      label="Mätarställning km"
                      value={form.odometer_km}
                      onChange={(value) => updateField("odometer_km", value)}
                    />

                    <SelectField
                      label="Bränsle / laddning"
                      value={form.fuel_level}
                      onChange={(value) => updateField("fuel_level", value)}
                      options={[
                        ["ok", "OK"],
                        ["low", "Låg nivå"],
                        ["not_checked", "Ej kontrollerad"],
                      ]}
                    />

                    <SelectField
                      label="Städning"
                      value={form.cleanliness_status}
                      onChange={(value) => updateField("cleanliness_status", value)}
                      options={[
                        ["ok", "OK"],
                        ["needs_cleaning", "Behöver städas"],
                        ["not_checked", "Ej kontrollerad"],
                      ]}
                    />

                    <SelectField
                      label="Status"
                      value={form.status}
                      onChange={(value) => updateField("status", value)}
                      options={[
                        ["approved", "Godkänd"],
                        ["needs_action", "Åtgärd krävs"],
                        ["blocked", "Får ej köras"],
                        ["draft", "Utkast"],
                      ]}
                    />
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Kontrollpunkter
                  </h2>

                  <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <CheckBox label="Utvändigt OK" checked={form.exterior_ok} onChange={(value) => updateField("exterior_ok", value)} />
                    <CheckBox label="Invändigt OK" checked={form.interior_ok} onChange={(value) => updateField("interior_ok", value)} />
                    <CheckBox label="Däck OK" checked={form.tires_ok} onChange={(value) => updateField("tires_ok", value)} />
                    <CheckBox label="Lampor OK" checked={form.lights_ok} onChange={(value) => updateField("lights_ok", value)} />
                    <CheckBox label="Bälten OK" checked={form.belts_ok} onChange={(value) => updateField("belts_ok", value)} />
                    <CheckBox label="WC OK" checked={form.wc_ok} onChange={(value) => updateField("wc_ok", value)} />
                    <CheckBox label="Dokument OK" checked={form.documents_ok} onChange={(value) => updateField("documents_ok", value)} />
                  </div>
                </section>

                <section className="grid gap-6 lg:grid-cols-2">
                  <TextArea
                    label="Skador / anmärkningar"
                    value={form.damage_notes}
                    onChange={(value) => updateField("damage_notes", value)}
                    placeholder="Skriv skador, fel eller anmärkningar..."
                  />

                  <TextArea
                    label="Intern anteckning"
                    value={form.notes}
                    onChange={(value) => updateField("notes", value)}
                    placeholder="Övrig information..."
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
                    href="/admin/fordon/status"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                  >
                    Avbryt
                  </Link>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Sparar..." : "Spara kontroll"}
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

function CheckBox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[#00645d]"
      />
      {label}
    </label>
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
