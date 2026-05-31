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
  km?: number | null;
  next_service_km?: number | null;
  status?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type ApiResponse = {
  ok: boolean;
  needsSetup?: boolean;
  vehicles?: VehicleRow[];
  summary?: {
    total: number;
    available: number;
    inTraffic: number;
    serviceSoon: number;
    inactive: number;
    totalKm: number;
  };
  error?: string;
};

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

function formatNumber(value?: number | null) {
  return new Intl.NumberFormat("sv-SE").format(Number(value || 0));
}

function serviceDistance(vehicle: VehicleRow) {
  const km = Number(vehicle.km || 0);
  const next = Number(vehicle.next_service_km || 0);

  if (!next) return null;

  return next - km;
}

function serviceText(vehicle: VehicleRow) {
  const distance = serviceDistance(vehicle);

  if (distance === null) return "Ej satt";
  if (distance <= 0) return "Service passerad";
  return formatNumber(distance) + " km kvar";
}

function serviceClass(vehicle: VehicleRow) {
  const distance = serviceDistance(vehicle);

  if (distance === null) return "text-slate-500";
  if (distance <= 0) return "text-red-700";
  if (distance <= 1500) return "text-amber-700";
  return "text-slate-900";
}

export default function FordonFlottaPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [summary, setSummary] = useState<ApiResponse["summary"]>({
    total: 0,
    available: 0,
    inTraffic: 0,
    serviceSoon: 0,
    inactive: 0,
    totalKm: 0,
  });

  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadVehicles() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);

      const res = await fetch("/api/admin/fordon/flotta?" + params.toString());
      const json: ApiResponse = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta fordonsflottan.");
      }

      setVehicles(json.vehicles || []);
      setSummary(
        json.summary || {
          total: 0,
          available: 0,
          inTraffic: 0,
          serviceSoon: 0,
          inactive: 0,
          totalKm: 0,
        }
      );
      setNeedsSetup(Boolean(json.needsSetup));
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

      const res = await fetch("/api/admin/fordon/flotta", {
        method: editId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editId || undefined,
          ...form,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara fordonet.");
      }

      setMessage(editId ? "Fordonet uppdaterades." : "Fordonet skapades.");
      resetForm();
      await loadVehicles();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara fordonet.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteVehicle(vehicle: VehicleRow) {
    const name = vehicle.vehicle_code || vehicle.registration_number || "fordonet";

    if (!window.confirm("Vill du ta bort " + name + "?")) {
      return;
    }

    try {
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/fordon/flotta", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: vehicle.id }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte ta bort fordonet.");
      }

      setMessage("Fordonet togs bort.");
      await loadVehicles();
    } catch (err: any) {
      setError(err?.message || "Kunde inte ta bort fordonet.");
    }
  }

  function resetForm() {
    setEditId("");
    setForm(emptyForm);
    setShowForm(false);
  }

  function startEdit(vehicle: VehicleRow) {
    setEditId(vehicle.id);
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
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  useEffect(() => {
    loadVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTotal = useMemo(() => vehicles.length, [vehicles]);

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
                  Flotta
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Här hanterar du Helsingbuss egna fordon, fordonsnummer, registreringsnummer, modell, status och kommande service.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (showForm) {
                      resetForm();
                    } else {
                      setShowForm(true);
                    }
                  }}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49]"
                >
                  {showForm ? "Stäng formulär" : "Nytt fordon"}
                </button>

                <button
                  type="button"
                  onClick={loadVehicles}
                  className="inline-flex items-center justify-center rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3548]"
                >
                  Uppdatera
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-5">
              <SummaryCard label="Totalt" value={summary?.total || 0} />
              <SummaryCard label="Tillgängliga" value={summary?.available || 0} tone="green" />
              <SummaryCard label="I trafik" value={summary?.inTraffic || 0} tone="blue" />
              <SummaryCard label="Service snart" value={summary?.serviceSoon || 0} tone="amber" />
              <SummaryCard label="Total km" value={summary?.totalKm || 0} tone="slate" />
            </div>

            {needsSetup && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800 shadow-sm">
                <h2 className="text-base font-bold">
                  Fordonstabellen saknas ännu
                </h2>
                <p className="mt-2 text-sm leading-6">
                  Tabellen <strong>vehicles</strong> saknas i databasen. Den behövs för Helsingbuss egna fordonsflotta.
                </p>
              </section>
            )}

            {showForm && (
              <form
                onSubmit={saveVehicle}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-2 border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    {editId ? "Redigera fordon" : "Nytt fordon"}
                  </h2>
                  <p className="text-sm text-slate-500">
                    Lägg in fordonsnummer, modell, registreringsnummer, mätarställning och serviceintervall.
                  </p>
                </div>

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

                <div className="mt-4">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Anteckningar
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    rows={4}
                    placeholder="Ex. utrustning, WC, bälten, servicehistorik, leasing, särskilda anmärkningar..."
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                  />
                </div>

                <div className="mt-5 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] transition hover:bg-slate-50"
                  >
                    Avbryt
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Sparar..." : editId ? "Spara ändringar" : "Spara fordon"}
                  </button>
                </div>
              </form>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[1fr_240px_140px]">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Sök
                  </label>
                  <input
                    value={q}
                    onChange={(event) => setQ(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") loadVehicles();
                    }}
                    placeholder="Sök fordonsnummer, registreringsnummer, modell eller anteckning..."
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                  />
                </div>

                <SelectField
                  label="Status"
                  value={status}
                  onChange={setStatus}
                  options={[
                    ["", "Alla"],
                    ["available", "Tillgängliga"],
                    ["in_traffic", "I trafik"],
                    ["service_soon", "Service snart"],
                    ["workshop", "På verkstad"],
                    ["inactive", "Inaktiva"],
                  ]}
                />

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={loadVehicles}
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
                    Fordonslista
                  </h2>
                  <p className="text-sm text-slate-500">
                    Visar {filteredTotal} fordon
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1120px] w-full border-collapse text-left text-sm">
                  <thead className="bg-[#194C66] text-white">
                    <tr>
                      <Th>Fordon</Th>
                      <Th>Registrering</Th>
                      <Th>Typ / modell</Th>
                      <Th>Mätarställning</Th>
                      <Th>Service</Th>
                      <Th>Status</Th>
                      <Th>Anteckning</Th>
                      <Th>Åtgärder</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-8 text-center text-slate-500">
                          Laddar fordonsflotta...
                        </td>
                      </tr>
                    ) : vehicles.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-10 text-center">
                          <div className="mx-auto max-w-lg">
                            <div className="text-base font-bold text-[#194C66]">
                              Inga fordon hittades
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              Skapa första fordonet med knappen Nytt fordon.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      vehicles.map((vehicle) => (
                        <tr key={vehicle.id} onClick={() => router.push("/admin/fordon/flotta/" + encodeURIComponent(vehicle.id))} className="cursor-pointer align-top transition hover:bg-slate-50">
                          <Td>
                            <div className="font-bold text-[#194C66]">
                              {vehicle.vehicle_code || "Fordon"}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {vehicle.model || "Modell saknas"}
                            </div>
                          </Td>

                          <Td>
                            <div className="font-semibold text-slate-900">
                              {vehicle.registration_number || "—"}
                            </div>
                          </Td>

                          <Td>
                            <div className="font-semibold text-slate-900">
                              {vehicle.vehicle_type || "—"}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {vehicle.model || "—"}
                            </div>
                          </Td>

                          <Td>
                            <div className="font-semibold text-slate-900">
                              {formatNumber(vehicle.km)} km
                            </div>
                          </Td>

                          <Td>
                            <div className={"font-semibold " + serviceClass(vehicle)}>
                              {serviceText(vehicle)}
                            </div>
                            {vehicle.next_service_km ? (
                              <div className="mt-1 text-xs text-slate-500">
                                Nästa: {formatNumber(vehicle.next_service_km)} km
                              </div>
                            ) : null}
                          </Td>

                          <Td>
                            <span
                              className={
                                "inline-flex rounded-full px-3 py-1 text-xs font-semibold " +
                                statusClass(vehicle.status)
                              }
                            >
                              {statusLabel(vehicle.status)}
                            </span>
                          </Td>

                          <Td>
                            <div className="max-w-[240px] truncate text-slate-600">
                              {vehicle.notes || "—"}
                            </div>
                          </Td>

                          <Td>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={(event) => { event.stopPropagation(); router.push("/admin/fordon/flotta/" + encodeURIComponent(vehicle.id)); }}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#194C66] transition hover:bg-slate-50"
                              >
                                Redigera
                              </button>

                              <button
                                type="button"
                                onClick={(event) => { event.stopPropagation(); deleteVehicle(vehicle); }}
                                className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                              >
                                Ta bort
                              </button>
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
      <div className="mt-2 text-3xl font-bold">{formatNumber(value)}</div>
    </div>
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
