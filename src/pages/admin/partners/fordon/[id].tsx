import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type OperatorRow = {
  id: string;
  name?: string | null;
  city?: string | null;
  status?: string | null;
};

type FormState = {
  partner_id: string;
  name: string;
  vehicle_type: string;
  registration_number: string;
  seats: string;
  environmental_class: string;
  fuel_type: string;
  comfort_level: string;
  status: string;
  notes: string;
};

const emptyForm: FormState = {
  partner_id: "",
  name: "",
  vehicle_type: "bus",
  registration_number: "",
  seats: "",
  environmental_class: "Euro 6",
  fuel_type: "HVO",
  comfort_level: "normal",
  status: "active",
  notes: "",
};

function statusLabel(status?: string | null) {
  switch (status) {
    case "active":
      return "Aktiv";
    case "inactive":
      return "Inaktiv";
    case "maintenance":
      return "Underhåll";
    case "blocked":
      return "Blockerad";
    default:
      return status || "Ej satt";
  }
}

function statusClass(status?: string | null) {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-700";
    case "maintenance":
      return "bg-amber-100 text-amber-700";
    case "blocked":
      return "bg-red-100 text-red-700";
    case "inactive":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function vehicleTypeLabel(type?: string | null) {
  switch (type) {
    case "coach":
      return "Turistbuss";
    case "bus":
      return "Buss";
    case "minibus":
      return "Minibuss";
    case "double_decker":
      return "Dubbeldäckare";
    case "sprinter":
      return "Sprinter";
    default:
      return type || "Fordon";
  }
}

function comfortLabel(level?: string | null) {
  switch (level) {
    case "standard":
      return "Standard";
    case "comfort":
      return "Comfort";
    case "premium":
      return "Premium";
    case "luxury":
      return "Lyx";
    default:
      return level || "Normal";
  }
}

export default function PartnerFordonDetailPage() {
  const router = useRouter();
  const id = String(router.query.id || "");

  const [operators, setOperators] = useState<OperatorRow[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [createdAt, setCreatedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function operatorName(id?: string | null) {
    const op = operators.find((item) => item.id === id);
    return op?.name || "—";
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function loadVehicle() {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/partners/fordon/" + encodeURIComponent(id));
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta fordonet.");
      }

      const vehicle = json.vehicle || {};

      setOperators(json.operators || []);
      setCreatedAt(vehicle.created_at || "");

      setForm({
        partner_id: vehicle.partner_id || "",
        name: vehicle.name || vehicle.vehicle_name || "",
        vehicle_type: vehicle.vehicle_type || "bus",
        registration_number: vehicle.registration_number || "",
        seats: vehicle.seats ? String(vehicle.seats) : "",
        environmental_class: vehicle.environmental_class || "",
        fuel_type: vehicle.fuel_type || "",
        comfort_level: vehicle.comfort_level || "normal",
        status: vehicle.status || "active",
        notes: vehicle.notes || "",
      });
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function saveVehicle(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/partners/fordon/" + encodeURIComponent(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara fordonet.");
      }

      setMessage("Fordonet sparades.");
      await loadVehicle();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara fordonet.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadVehicle();
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
                  Operatörer & partners
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  {loading ? "Fordon" : form.name || "Fordon"}
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  {operatorName(form.partner_id)}
                  {createdAt ? " · Skapad " + new Date(createdAt).toLocaleString("sv-SE") : ""}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/admin/partners/fordon"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Tillbaka
                </Link>

                <button
                  type="submit"
                  form="vehicle-edit-form"
                  disabled={saving || loading}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Sparar..." : "Spara fordon"}
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
                Laddar fordon...
              </section>
            ) : (
              <form id="vehicle-edit-form" onSubmit={saveVehicle} className="space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {vehicleTypeLabel(form.vehicle_type)}
                      </div>

                      <h2 className="mt-2 text-2xl font-bold text-[#194C66]">
                        {form.name || "Fordon"}
                      </h2>

                      <p className="mt-2 text-sm text-slate-600">
                        {form.registration_number || "Registreringsnummer saknas"} · {form.seats || "0"} säten
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={
                          "inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold " +
                          statusClass(form.status)
                        }
                      >
                        {statusLabel(form.status)}
                      </span>

                      <span className="inline-flex w-fit rounded-full bg-[#eef8fb] px-4 py-2 text-sm font-semibold text-[#194C66]">
                        {comfortLabel(form.comfort_level)}
                      </span>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Fordonsuppgifter
                  </h2>

                  <div className="mt-5 grid gap-4 lg:grid-cols-3">
                    <SelectField
                      label="Operatör"
                      value={form.partner_id}
                      onChange={(value) => updateField("partner_id", value)}
                      options={[
                        ["", "Välj operatör"],
                        ...operators.map((op) => [op.id, op.name || "Operatör"] as [string, string]),
                      ]}
                    />

                    <Field
                      label="Fordonsnamn"
                      value={form.name}
                      onChange={(value) => updateField("name", value)}
                      placeholder="Ex. Mercedes-Benz Tourismo"
                    />

                    <SelectField
                      label="Fordonstyp"
                      value={form.vehicle_type}
                      onChange={(value) => updateField("vehicle_type", value)}
                      options={[
                        ["bus", "Buss"],
                        ["coach", "Turistbuss"],
                        ["minibus", "Minibuss"],
                        ["sprinter", "Sprinter"],
                        ["double_decker", "Dubbeldäckare"],
                      ]}
                    />

                    <Field
                      label="Registreringsnummer"
                      value={form.registration_number}
                      onChange={(value) => updateField("registration_number", value)}
                    />

                    <Field
                      label="Antal säten"
                      value={form.seats}
                      onChange={(value) => updateField("seats", value)}
                    />

                    <Field
                      label="Miljöklass"
                      value={form.environmental_class}
                      onChange={(value) => updateField("environmental_class", value)}
                    />

                    <Field
                      label="Bränsle"
                      value={form.fuel_type}
                      onChange={(value) => updateField("fuel_type", value)}
                    />

                    <SelectField
                      label="Komfort"
                      value={form.comfort_level}
                      onChange={(value) => updateField("comfort_level", value)}
                      options={[
                        ["normal", "Normal"],
                        ["standard", "Standard"],
                        ["comfort", "Comfort"],
                        ["premium", "Premium"],
                        ["luxury", "Lyx"],
                      ]}
                    />

                    <SelectField
                      label="Status"
                      value={form.status}
                      onChange={(value) => updateField("status", value)}
                      options={[
                        ["active", "Aktiv"],
                        ["maintenance", "Underhåll"],
                        ["inactive", "Inaktiv"],
                        ["blocked", "Blockerad"],
                      ]}
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
                    rows={7}
                    className="mt-5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                  />
                </section>

                <div className="flex justify-end gap-3">
                  <Link
                    href="/admin/partners/fordon"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                  >
                    Avbryt
                  </Link>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Sparar..." : "Spara fordon"}
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
      <input
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
