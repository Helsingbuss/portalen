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
  contract_type: string;
  supplier: string;
  contract_number: string;
  start_date: string;
  end_date: string;
  monthly_cost: string;
  deductible_amount: string;
  status: string;
  document_url: string;
  notes: string;
};

const emptyForm: FormState = {
  vehicle_id: "",
  contract_type: "insurance",
  supplier: "",
  contract_number: "",
  start_date: new Date().toISOString().slice(0, 10),
  end_date: "",
  monthly_cost: "",
  deductible_amount: "",
  status: "active",
  document_url: "",
  notes: "",
};

function contractTypeLabel(type?: string | null) {
  switch (type) {
    case "insurance":
      return "Försäkring";
    case "leasing":
      return "Leasing";
    case "finance":
      return "Finans";
    case "service_agreement":
      return "Serviceavtal";
    case "warranty":
      return "Garanti";
    case "other":
      return "Övrigt";
    default:
      return type || "Avtal";
  }
}

function statusLabel(status?: string | null) {
  switch (status) {
    case "active":
      return "Aktiv";
    case "draft":
      return "Utkast";
    case "pending":
      return "Väntar";
    case "expired":
      return "Utgången";
    case "cancelled":
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
    case "draft":
      return "bg-amber-100 text-amber-700";
    case "expired":
      return "bg-red-100 text-red-700";
    case "cancelled":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function typeClass(type?: string | null) {
  switch (type) {
    case "insurance":
      return "bg-[#eef8fb] text-[#194C66]";
    case "leasing":
      return "bg-blue-100 text-blue-700";
    case "finance":
      return "bg-amber-100 text-amber-700";
    case "service_agreement":
      return "bg-emerald-100 text-emerald-700";
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

function fmtMoney(value?: string | number | null) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
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

export default function FordonAvtalDetailPage() {
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

  async function loadContract() {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/fordon/avtal/" + encodeURIComponent(id));
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta fordonsavtalet.");
      }

      const contract = json.contract || {};

      setVehicles(json.vehicles || []);
      setCreatedAt(contract.created_at || "");
      setUpdatedAt(contract.updated_at || "");

      setForm({
        vehicle_id: contract.vehicle_id || "",
        contract_type: contract.contract_type || "insurance",
        supplier: contract.supplier || "",
        contract_number: contract.contract_number || "",
        start_date: contract.start_date ? String(contract.start_date).slice(0, 10) : "",
        end_date: contract.end_date ? String(contract.end_date).slice(0, 10) : "",
        monthly_cost:
          contract.monthly_cost !== null && contract.monthly_cost !== undefined
            ? String(contract.monthly_cost)
            : "",
        deductible_amount:
          contract.deductible_amount !== null && contract.deductible_amount !== undefined
            ? String(contract.deductible_amount)
            : "",
        status: contract.status || "active",
        document_url: contract.document_url || "",
        notes: contract.notes || "",
      });
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function saveContract(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/fordon/avtal/" + encodeURIComponent(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara fordonsavtalet.");
      }

      setMessage("Fordonsavtalet sparades.");
      await loadContract();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara fordonsavtalet.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadContract();
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
                  {loading ? "Fordonsavtal" : form.supplier || "Fordonsavtal"}
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  {selectedVehicleName()}
                  {updatedAt ? " · Uppdaterad " + new Date(updatedAt).toLocaleString("sv-SE") : ""}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/admin/fordon/avtal"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Tillbaka
                </Link>

                {form.document_url && (
                  <a
                    href={String(form.document_url).startsWith("http") ? form.document_url : "https://" + form.document_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#00645d] shadow-sm transition hover:bg-slate-50"
                  >
                    Öppna dokument
                  </a>
                )}

                <button
                  type="submit"
                  form="vehicle-contract-edit-form"
                  disabled={saving || loading}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Sparar..." : "Spara avtal"}
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
                Laddar fordonsavtal...
              </section>
            ) : (
              <form id="vehicle-contract-edit-form" onSubmit={saveContract} className="space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {contractTypeLabel(form.contract_type)}
                      </div>

                      <h2 className="mt-2 text-2xl font-bold text-[#194C66]">
                        {form.supplier || "Leverantör saknas"}
                      </h2>

                      <p className="mt-2 text-sm text-slate-600">
                        {selectedVehicleName()} · {form.contract_number || "Avtalsnummer saknas"} · {fmtMoney(form.monthly_cost)}/månad
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={
                          "inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold " +
                          typeClass(form.contract_type)
                        }
                      >
                        {contractTypeLabel(form.contract_type)}
                      </span>

                      <span
                        className={
                          "inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold " +
                          (isExpiringSoon(form.end_date) && form.status === "active"
                            ? "bg-amber-100 text-amber-700"
                            : statusClass(form.status))
                        }
                      >
                        {isExpiringSoon(form.end_date) && form.status === "active"
                          ? "Går ut snart"
                          : statusLabel(form.status)}
                      </span>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Avtalsuppgifter
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
                      label="Avtalstyp"
                      value={form.contract_type}
                      onChange={(value) => updateField("contract_type", value)}
                      options={[
                        ["insurance", "Försäkring"],
                        ["leasing", "Leasing"],
                        ["finance", "Finans"],
                        ["service_agreement", "Serviceavtal"],
                        ["warranty", "Garanti"],
                        ["other", "Övrigt"],
                      ]}
                    />

                    <Field
                      label="Leverantör"
                      value={form.supplier}
                      onChange={(value) => updateField("supplier", value)}
                      placeholder="Ex. Försäkringsbolag"
                    />

                    <Field
                      label="Avtalsnummer"
                      value={form.contract_number}
                      onChange={(value) => updateField("contract_number", value)}
                    />

                    <Field
                      label="Startdatum"
                      type="date"
                      value={form.start_date}
                      onChange={(value) => updateField("start_date", value)}
                    />

                    <Field
                      label="Slutdatum"
                      type="date"
                      value={form.end_date}
                      onChange={(value) => updateField("end_date", value)}
                    />

                    <Field
                      label="Månadskostnad"
                      value={form.monthly_cost}
                      onChange={(value) => updateField("monthly_cost", value)}
                    />

                    <Field
                      label="Självrisk"
                      value={form.deductible_amount}
                      onChange={(value) => updateField("deductible_amount", value)}
                    />

                    <SelectField
                      label="Status"
                      value={form.status}
                      onChange={(value) => updateField("status", value)}
                      options={[
                        ["active", "Aktiv"],
                        ["draft", "Utkast"],
                        ["pending", "Väntar"],
                        ["expired", "Utgången"],
                        ["cancelled", "Avslutad"],
                      ]}
                    />

                    <Field
                      label="Dokumentlänk"
                      value={form.document_url}
                      onChange={(value) => updateField("document_url", value)}
                      placeholder="https://..."
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
                    placeholder="Ex. villkor, uppsägningstid, kontaktperson, särskilda krav..."
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
                    href="/admin/fordon/avtal"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                  >
                    Avbryt
                  </Link>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Sparar..." : "Spara avtal"}
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
