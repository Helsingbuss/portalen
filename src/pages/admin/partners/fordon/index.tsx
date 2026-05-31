import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type OperatorRow = {
  id: string;
  name?: string | null;
  city?: string | null;
  status?: string | null;
};

type VehicleRow = {
  id: string;
  partner_id?: string | null;
  name?: string | null;
  vehicle_name?: string | null;
  vehicle_type?: string | null;
  registration_number?: string | null;
  seats?: number | null;
  environmental_class?: string | null;
  fuel_type?: string | null;
  comfort_level?: string | null;
  status?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type ApiResponse = {
  ok: boolean;
  needsSetup?: boolean;
  operators?: OperatorRow[];
  vehicles?: VehicleRow[];
  summary?: {
    total: number;
    active: number;
    euro6: number;
    seats: number;
  };
  error?: string;
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

export default function PartnerFordonPage() {
  const router = useRouter();
  const [operators, setOperators] = useState<OperatorRow[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [summary, setSummary] = useState<ApiResponse["summary"]>({
    total: 0,
    active: 0,
    euro6: 0,
    seats: 0,
  });
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [q, setQ] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [status, setStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function operatorName(id?: string | null) {
    const op = operators.find((item) => item.id === id);
    return op?.name || "—";
  }

  async function loadVehicles() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (q.trim()) params.set("q", q.trim());
      if (partnerId) params.set("partner_id", partnerId);
      if (status) params.set("status", status);

      const res = await fetch("/api/admin/partners/fordon?" + params.toString());
      const json: ApiResponse = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta fordon.");
      }

      setOperators(json.operators || []);
      setVehicles(json.vehicles || []);
      setSummary(json.summary || { total: 0, active: 0, euro6: 0, seats: 0 });
      setNeedsSetup(Boolean(json.needsSetup));
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function createVehicle(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/partners/fordon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte skapa fordon.");
      }

      setMessage("Fordonet sparades på operatören.");
      setForm(emptyForm);
      setShowForm(false);
      await loadVehicles();
    } catch (err: any) {
      setError(err?.message || "Kunde inte skapa fordon.");
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
                  Operatörer & partners
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  Fordon per operatör
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Koppla bussar och fordon till operatörer. Dessa kan senare användas för resor, avgångar, uppdrag och partnerflöden.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm((value) => !value)}
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

            <div className="grid gap-4 md:grid-cols-4">
              <SummaryCard label="Totalt" value={summary?.total || 0} />
              <SummaryCard label="Aktiva" value={summary?.active || 0} tone="green" />
              <SummaryCard label="Euro 6" value={summary?.euro6 || 0} tone="blue" />
              <SummaryCard label="Totalt antal säten" value={summary?.seats || 0} tone="amber" />
            </div>

            {needsSetup && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800 shadow-sm">
                <h2 className="text-base font-bold">
                  Appens fordonstabell saknas ännu
                </h2>
                <p className="mt-2 text-sm leading-6">
                  Tabellen <strong>app_partner_vehicles</strong> saknas i databasen. Eftersom appen redan är byggd mot den tabellen bör vi skapa/återställa den.
                </p>
              </section>
            )}

            {showForm && (
              <form
                onSubmit={createVehicle}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-2 border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Nytt fordon
                  </h2>
                  <p className="text-sm text-slate-500">
                    Välj operatör och lägg in fordonets kapacitet, miljöklass och status.
                  </p>
                </div>

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

                  <Field label="Fordonsnamn" value={form.name} onChange={(value) => updateField("name", value)} placeholder="Ex. Mercedes-Benz Tourismo" />

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

                  <Field label="Registreringsnummer" value={form.registration_number} onChange={(value) => updateField("registration_number", value)} />
                  <Field label="Antal säten" value={form.seats} onChange={(value) => updateField("seats", value)} />
                  <Field label="Miljöklass" value={form.environmental_class} onChange={(value) => updateField("environmental_class", value)} />

                  <Field label="Bränsle" value={form.fuel_type} onChange={(value) => updateField("fuel_type", value)} />

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

                <div className="mt-4">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Anteckningar
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    rows={4}
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
                    {saving ? "Sparar..." : "Spara fordon"}
                  </button>
                </div>
              </form>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[1fr_260px_220px_140px]">
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
                    placeholder="Sök fordon, registreringsnummer, operatör, miljöklass..."
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                  />
                </div>

                <SelectField
                  label="Operatör"
                  value={partnerId}
                  onChange={setPartnerId}
                  options={[
                    ["", "Alla operatörer"],
                    ...operators.map((op) => [op.id, op.name || "Operatör"] as [string, string]),
                  ]}
                />

                <SelectField
                  label="Status"
                  value={status}
                  onChange={setStatus}
                  options={[
                    ["", "Alla"],
                    ["active", "Aktiva"],
                    ["maintenance", "Underhåll"],
                    ["inactive", "Inaktiva"],
                    ["blocked", "Blockerade"],
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
                      <Th>Operatör</Th>
                      <Th>Kapacitet</Th>
                      <Th>Miljö / bränsle</Th>
                      <Th>Komfort</Th>
                      <Th>Status</Th>
                      <Th>Anteckning</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                          Laddar fordon...
                        </td>
                      </tr>
                    ) : vehicles.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-10 text-center">
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
                        <tr key={vehicle.id} onClick={() => router.push("/admin/partners/fordon/" + encodeURIComponent(vehicle.id))} className="cursor-pointer align-top transition hover:bg-slate-50">
                          <Td>
                            <div className="font-bold text-[#194C66]">
                              {vehicle.name || vehicle.vehicle_name || "Fordon"}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {vehicle.registration_number || "Reg.nr saknas"}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {vehicleTypeLabel(vehicle.vehicle_type)}
                            </div>
                          </Td>

                          <Td>
                            <div className="max-w-[220px] truncate font-semibold text-slate-900">
                              {operatorName(vehicle.partner_id)}
                            </div>
                          </Td>

                          <Td>
                            <div className="font-semibold text-slate-900">
                              {vehicle.seats ? vehicle.seats + " säten" : "—"}
                            </div>
                          </Td>

                          <Td>
                            <div className="font-semibold text-slate-900">
                              {vehicle.environmental_class || "—"}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {vehicle.fuel_type || "Bränsle saknas"}
                            </div>
                          </Td>

                          <Td>
                            <span className="rounded-full bg-[#eef8fb] px-3 py-1 text-xs font-semibold text-[#194C66]">
                              {comfortLabel(vehicle.comfort_level)}
                            </span>
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
                            <div className="max-w-[260px] truncate text-slate-600">
                              {vehicle.notes || "—"}
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
  tone?: "green" | "amber" | "red" | "blue";
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
            : "text-[#194C66] bg-white";

  return (
    <div className={"rounded-2xl border border-slate-200 p-5 shadow-sm " + color}>
      <div className="text-sm font-semibold opacity-80">{label}</div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
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
