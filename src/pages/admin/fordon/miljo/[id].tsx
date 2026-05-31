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
  euro_class?: string | null;
};

type FormState = {
  vehicle_id: string;
  log_date: string;
  odometer_km: string;
  fuel_type: string;
  quantity: string;
  unit: string;
  unit_price: string;
  total_cost: string;
  supplier: string;
  station_location: string;
  price_source: string;
  euro_class: string;
  co2_note: string;
  environmental_note: string;
  status: string;
  notes: string;
};

const emptyForm: FormState = {
  vehicle_id: "",
  log_date: new Date().toISOString().slice(0, 10),
  odometer_km: "",
  fuel_type: "hvo",
  quantity: "",
  unit: "liter",
  unit_price: "",
  total_cost: "",
  supplier: "",
  station_location: "",
  price_source: "Manuellt / kvitto",
  euro_class: "Euro 6",
  co2_note: "",
  environmental_note: "",
  status: "registered",
  notes: "",
};

function fuelTypeLabel(type?: string | null) {
  switch (type) {
    case "hvo":
      return "HVO";
    case "diesel":
      return "Diesel";
    case "electric":
      return "El";
    case "biogas":
      return "Biogas";
    case "biodiesel":
      return "Biodiesel";
    case "petrol":
      return "Bensin";
    case "other":
      return "Övrigt";
    default:
      return type || "Bränsle";
  }
}

function statusLabel(status?: string | null) {
  switch (status) {
    case "registered":
      return "Registrerad";
    case "estimated":
      return "Uppskattad";
    case "verified":
      return "Verifierad";
    case "draft":
      return "Utkast";
    default:
      return status || "Ej satt";
  }
}

function fuelTypeClass(type?: string | null) {
  switch (type) {
    case "hvo":
    case "biodiesel":
    case "biogas":
      return "bg-emerald-100 text-emerald-700";
    case "electric":
      return "bg-blue-100 text-blue-700";
    case "diesel":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function statusClass(status?: string | null) {
  switch (status) {
    case "verified":
      return "bg-emerald-100 text-emerald-700";
    case "registered":
      return "bg-blue-100 text-blue-700";
    case "estimated":
      return "bg-amber-100 text-amber-700";
    case "draft":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function fmtNumber(value?: string | number | null) {
  return new Intl.NumberFormat("sv-SE", {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function fmtMoney(value?: string | number | null) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function parseNumber(value: string) {
  const n = Number(String(value || "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
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

export default function FordonMiljoDetailPage() {
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
    setForm((prev) => {
      const next = {
        ...prev,
        [key]: value,
      };

      if (key === "quantity" || key === "unit_price") {
        const quantity = parseNumber(key === "quantity" ? String(value) : next.quantity);
        const unitPrice = parseNumber(key === "unit_price" ? String(value) : next.unit_price);

        if (quantity && unitPrice) {
          next.total_cost = String(Number((quantity * unitPrice).toFixed(2)));
        }
      }

      if (key === "fuel_type") {
        next.unit = value === "electric" ? "kWh" : "liter";
      }

      return next;
    });
  }

  async function loadLog() {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/fordon/miljo/" + encodeURIComponent(id));
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta bränsleposten.");
      }

      const log = json.log || {};

      setVehicles(json.vehicles || []);
      setCreatedAt(log.created_at || "");
      setUpdatedAt(log.updated_at || "");

      setForm({
        vehicle_id: log.vehicle_id || "",
        log_date: log.log_date ? String(log.log_date).slice(0, 10) : "",
        odometer_km:
          log.odometer_km !== null && log.odometer_km !== undefined
            ? String(log.odometer_km)
            : "",
        fuel_type: log.fuel_type || "hvo",
        quantity:
          log.quantity !== null && log.quantity !== undefined ? String(log.quantity) : "",
        unit: log.unit || "liter",
        unit_price:
          log.unit_price !== null && log.unit_price !== undefined ? String(log.unit_price) : "",
        total_cost:
          log.total_cost !== null && log.total_cost !== undefined ? String(log.total_cost) : "",
        supplier: log.supplier || "",
        station_location: log.station_location || "",
        price_source: log.price_source || "Manuellt / kvitto",
        euro_class: log.euro_class || "Euro 6",
        co2_note: log.co2_note || "",
        environmental_note: log.environmental_note || "",
        status: log.status || "registered",
        notes: log.notes || "",
      });
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function saveLog(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const payload = {
        ...form,
        total_cost:
          form.total_cost ||
          String(Number((parseNumber(form.quantity) * parseNumber(form.unit_price)).toFixed(2))),
      };

      const res = await fetch("/api/admin/fordon/miljo/" + encodeURIComponent(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara bränsleposten.");
      }

      setMessage("Bränsleposten sparades.");
      await loadLog();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara bränsleposten.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadLog();
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
                  Bränsle & miljö
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  {selectedVehicleName()}
                  {updatedAt ? " · Uppdaterad " + new Date(updatedAt).toLocaleString("sv-SE") : ""}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/admin/fordon/miljo"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Tillbaka
                </Link>

                <button
                  type="submit"
                  form="vehicle-environment-edit-form"
                  disabled={saving || loading}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Sparar..." : "Spara bränslepost"}
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
                Laddar bränslepost...
              </section>
            ) : (
              <form id="vehicle-environment-edit-form" onSubmit={saveLog} className="space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {fuelTypeLabel(form.fuel_type)}
                      </div>

                      <h2 className="mt-2 text-2xl font-bold text-[#194C66]">
                        {selectedVehicleName()}
                      </h2>

                      <p className="mt-2 text-sm text-slate-600">
                        {fmtNumber(form.quantity)} {form.unit} · {fmtNumber(form.unit_price)} kr/enhet · {fmtMoney(form.total_cost)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className={"inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold " + fuelTypeClass(form.fuel_type)}>
                        {fuelTypeLabel(form.fuel_type)}
                      </span>

                      <span className={"inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold " + statusClass(form.status)}>
                        {statusLabel(form.status)}
                      </span>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Bränsleuppgifter
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

                    <Field label="Datum" type="date" value={form.log_date} onChange={(value) => updateField("log_date", value)} />
                    <Field label="Mätarställning km" value={form.odometer_km} onChange={(value) => updateField("odometer_km", value)} />

                    <SelectField
                      label="Bränsletyp"
                      value={form.fuel_type}
                      onChange={(value) => updateField("fuel_type", value)}
                      options={[
                        ["hvo", "HVO"],
                        ["diesel", "Diesel"],
                        ["electric", "El"],
                        ["biogas", "Biogas"],
                        ["biodiesel", "Biodiesel"],
                        ["petrol", "Bensin"],
                        ["other", "Övrigt"],
                      ]}
                    />

                    <Field label="Mängd" value={form.quantity} onChange={(value) => updateField("quantity", value)} />
                    <Field label="Enhet" value={form.unit} onChange={(value) => updateField("unit", value)} />
                    <Field label="Pris per enhet" value={form.unit_price} onChange={(value) => updateField("unit_price", value)} />
                    <Field label="Total kostnad" value={form.total_cost} onChange={(value) => updateField("total_cost", value)} />

                    <Field label="Leverantör" value={form.supplier} onChange={(value) => updateField("supplier", value)} />
                    <Field label="Tankställe / plats" value={form.station_location} onChange={(value) => updateField("station_location", value)} />
                    <Field label="Priskälla" value={form.price_source} onChange={(value) => updateField("price_source", value)} />
                    <Field label="Euroklass" value={form.euro_class} onChange={(value) => updateField("euro_class", value)} />

                    <SelectField
                      label="Status"
                      value={form.status}
                      onChange={(value) => updateField("status", value)}
                      options={[
                        ["registered", "Registrerad"],
                        ["estimated", "Uppskattad"],
                        ["verified", "Verifierad"],
                        ["draft", "Utkast"],
                      ]}
                    />
                  </div>
                </section>

                <section className="grid gap-6 lg:grid-cols-2">
                  <TextArea
                    label="CO₂ / miljönotering"
                    value={form.co2_note}
                    onChange={(value) => updateField("co2_note", value)}
                    placeholder="Ex. HVO används för lägre fossil klimatpåverkan..."
                  />

                  <TextArea
                    label="Driftanteckning"
                    value={form.notes}
                    onChange={(value) => updateField("notes", value)}
                    placeholder="Ex. kvitto, avvikelse, särskild körning eller intern anteckning..."
                  />
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Extra miljöinformation
                  </h2>

                  <textarea
                    value={form.environmental_note}
                    onChange={(event) => updateField("environmental_note", event.target.value)}
                    rows={6}
                    placeholder="Ex. miljöredovisning, drivmedelskrav, avvikelse eller hållbarhetsnotering..."
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
                    href="/admin/fordon/miljo"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                  >
                    Avbryt
                  </Link>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Sparar..." : "Spara bränslepost"}
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
