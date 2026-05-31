import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type FormState = {
  vehicle_code: string;
  registration_number: string;
  model: string;
  vehicle_type: string;
  km: string;
  next_service_km: string;
  status: string;
  notes: string;
};

const emptyForm: FormState = {
  vehicle_code: "",
  registration_number: "",
  model: "",
  vehicle_type: "Turistbuss",
  km: "",
  next_service_km: "",
  status: "available",
  notes: "",
};

function statusLabel(status?: string | null) {
  switch (status) {
    case "available":
      return "Tillgänglig";
    case "in_traffic":
      return "I trafik";
    case "service_soon":
      return "Service snart";
    case "workshop":
      return "På verkstad";
    case "inactive":
      return "Inaktiv";
    default:
      return status || "Ej satt";
  }
}

function statusClass(status?: string | null) {
  switch (status) {
    case "available":
      return "bg-emerald-100 text-emerald-700";
    case "in_traffic":
      return "bg-blue-100 text-blue-700";
    case "service_soon":
      return "bg-amber-100 text-amber-700";
    case "workshop":
      return "bg-red-100 text-red-700";
    case "inactive":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function formatNumber(value?: string | number | null) {
  return new Intl.NumberFormat("sv-SE").format(Number(value || 0));
}

function serviceDistance(form: FormState) {
  const km = Number(form.km || 0);
  const next = Number(form.next_service_km || 0);

  if (!next) return null;

  return next - km;
}

function serviceText(form: FormState) {
  const distance = serviceDistance(form);

  if (distance === null) return "Serviceintervall ej satt";
  if (distance <= 0) return "Service passerad";
  return formatNumber(distance) + " km kvar till service";
}

function serviceBadgeClass(form: FormState) {
  const distance = serviceDistance(form);

  if (distance === null) return "bg-slate-100 text-slate-700";
  if (distance <= 0) return "bg-red-100 text-red-700";
  if (distance <= 1500) return "bg-amber-100 text-amber-700";
  return "bg-[#eef8fb] text-[#194C66]";
}

export default function FordonFlottaDetailPage() {
  const router = useRouter();
  const id = String(router.query.id || "");

  const [form, setForm] = useState<FormState>(emptyForm);
  const [createdAt, setCreatedAt] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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

      const res = await fetch("/api/admin/fordon/flotta/" + encodeURIComponent(id));
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta fordonet.");
      }

      const vehicle = json.vehicle || {};

      setCreatedAt(vehicle.created_at || "");
      setUpdatedAt(vehicle.updated_at || "");

      setForm({
        vehicle_code: vehicle.vehicle_code || "",
        registration_number: vehicle.registration_number || "",
        model: vehicle.model || "",
        vehicle_type: vehicle.vehicle_type || "Turistbuss",
        km: vehicle.km !== null && vehicle.km !== undefined ? String(vehicle.km) : "",
        next_service_km:
          vehicle.next_service_km !== null && vehicle.next_service_km !== undefined
            ? String(vehicle.next_service_km)
            : "",
        status: vehicle.status || "available",
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

      const res = await fetch("/api/admin/fordon/flotta/" + encodeURIComponent(id), {
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
                  Fordon & dokument
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  {loading ? "Fordon" : form.vehicle_code || "Fordon"}
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  {form.registration_number || "Registreringsnummer saknas"}
                  {updatedAt ? " · Uppdaterad " + new Date(updatedAt).toLocaleString("sv-SE") : ""}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/admin/fordon/flotta"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Tillbaka
                </Link>

                <button
                  type="submit"
                  form="vehicle-detail-form"
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
              <form id="vehicle-detail-form" onSubmit={saveVehicle} className="space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Helsingbuss egna fordon
                      </div>

                      <h2 className="mt-2 text-2xl font-bold text-[#194C66]">
                        {form.vehicle_code || "Fordon"}
                      </h2>

                      <p className="mt-2 text-sm text-slate-600">
                        {form.model || "Modell saknas"} · {form.registration_number || "Reg.nr saknas"}
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

                      <span
                        className={
                          "inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold " +
                          serviceBadgeClass(form)
                        }
                      >
                        {serviceText(form)}
                      </span>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Fordonsuppgifter
                  </h2>

                  <div className="mt-5 grid gap-4 lg:grid-cols-4">
                    <Field
                      label="Fordonsnummer"
                      value={form.vehicle_code}
                      onChange={(value) => updateField("vehicle_code", value)}
                      placeholder="Ex. HB-123"
                    />

                    <Field
                      label="Registreringsnummer"
                      value={form.registration_number}
                      onChange={(value) => updateField("registration_number", value)}
                      placeholder="ABC123"
                    />

                    <Field
                      label="Modell"
                      value={form.model}
                      onChange={(value) => updateField("model", value)}
                      placeholder="Mercedes-Benz Tourismo"
                    />

                    <Field
                      label="Fordonstyp"
                      value={form.vehicle_type}
                      onChange={(value) => updateField("vehicle_type", value)}
                      placeholder="Turistbuss"
                    />

                    <Field
                      label="Mätarställning km"
                      value={form.km}
                      onChange={(value) => updateField("km", value)}
                      placeholder="125000"
                    />

                    <Field
                      label="Nästa service km"
                      value={form.next_service_km}
                      onChange={(value) => updateField("next_service_km", value)}
                      placeholder="135000"
                    />

                    <SelectField
                      label="Status"
                      value={form.status}
                      onChange={(value) => updateField("status", value)}
                      options={[
                        ["available", "Tillgänglig"],
                        ["in_traffic", "I trafik"],
                        ["service_soon", "Service snart"],
                        ["workshop", "På verkstad"],
                        ["inactive", "Inaktiv"],
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
                    rows={8}
                    placeholder="Ex. utrustning, WC, bälten, servicehistorik, leasing, särskilda anmärkningar..."
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
                    href="/admin/fordon/flotta"
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
