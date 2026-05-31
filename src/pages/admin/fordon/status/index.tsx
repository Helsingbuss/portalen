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
  status?: string | null;
};

type CheckRow = {
  id: string;
  vehicle_id?: string | null;
  check_date?: string | null;
  checked_by?: string | null;
  odometer_km?: number | null;
  fuel_level?: string | null;
  cleanliness_status?: string | null;
  exterior_ok?: boolean | null;
  interior_ok?: boolean | null;
  tires_ok?: boolean | null;
  lights_ok?: boolean | null;
  belts_ok?: boolean | null;
  wc_ok?: boolean | null;
  documents_ok?: boolean | null;
  damage_notes?: string | null;
  status?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type ApiResponse = {
  ok: boolean;
  needsSetup?: boolean;
  vehicles?: VehicleRow[];
  checks?: CheckRow[];
  summary?: {
    total: number;
    today: number;
    approved: number;
    needsAction: number;
    blocked: number;
  };
  error?: string;
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

function conditionLabel(value?: string | null) {
  switch (value) {
    case "ok":
      return "OK";
    case "low":
      return "Låg";
    case "needs_cleaning":
      return "Behöver städas";
    case "not_checked":
      return "Ej kontrollerad";
    default:
      return value || "—";
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

function fmtNumber(value?: number | null) {
  return new Intl.NumberFormat("sv-SE").format(Number(value || 0));
}

export default function FordonStatusPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [checks, setChecks] = useState<CheckRow[]>([]);
  const [summary, setSummary] = useState<ApiResponse["summary"]>({
    total: 0,
    today: 0,
    approved: 0,
    needsAction: 0,
    blocked: 0,
  });

  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
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
      .join(" · ");
  }

  async function loadChecks() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      if (vehicleId) params.set("vehicle_id", vehicleId);

      const res = await fetch("/api/admin/fordon/status?" + params.toString());
      const json: ApiResponse = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta fordonsstatus/checklistor.");
      }

      setVehicles(json.vehicles || []);
      setChecks(json.checks || []);
      setSummary(json.summary || { total: 0, today: 0, approved: 0, needsAction: 0, blocked: 0 });
      setNeedsSetup(Boolean(json.needsSetup));
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function createCheck(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/fordon/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara checklistan.");
      }

      setMessage("Checklistan sparades.");
      setForm(emptyForm);
      setShowForm(false);
      await loadChecks();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara checklistan.");
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
    loadChecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTotal = useMemo(() => checks.length, [checks]);

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
                  Fordonsstatus / checklistor
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Här registrerar du daglig fordonskontroll, status, mätarställning, skador och om fordonet är godkänt att köra.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm((value) => !value)}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49]"
                >
                  {showForm ? "Stäng formulär" : "Ny fordonskontroll"}
                </button>

                <button
                  type="button"
                  onClick={loadChecks}
                  className="inline-flex items-center justify-center rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3548]"
                >
                  Uppdatera
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-5">
              <SummaryCard label="Totalt" value={summary?.total || 0} />
              <SummaryCard label="Idag" value={summary?.today || 0} tone="blue" />
              <SummaryCard label="Godkända" value={summary?.approved || 0} tone="green" />
              <SummaryCard label="Åtgärd krävs" value={summary?.needsAction || 0} tone="amber" />
              <SummaryCard label="Får ej köras" value={summary?.blocked || 0} tone="red" />
            </div>

            {needsSetup && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800 shadow-sm">
                <h2 className="text-base font-bold">
                  Checklisttabellen saknas ännu
                </h2>
                <p className="mt-2 text-sm leading-6">
                  Tabellen <strong>vehicle_checks</strong> saknas i databasen. Kör SQL-koden nedan så kan checklistor sparas.
                </p>
              </section>
            )}

            {showForm && (
              <form
                onSubmit={createCheck}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-2 border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Ny fordonskontroll
                  </h2>
                  <p className="text-sm text-slate-500">
                    Fyll i fordon, datum, kontrollpunkter och om fordonet är godkänt för körning.
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
                    value={form.check_date}
                    onChange={(value) => updateField("check_date", value)}
                  />

                  <Field
                    label="Kontrollerad av"
                    value={form.checked_by}
                    onChange={(value) => updateField("checked_by", value)}
                    placeholder="Namn"
                  />

                  <Field
                    label="Mätarställning km"
                    value={form.odometer_km}
                    onChange={(value) => updateField("odometer_km", value)}
                    placeholder="125000"
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

                <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <CheckBox label="Utvändigt OK" checked={form.exterior_ok} onChange={(value) => updateField("exterior_ok", value)} />
                  <CheckBox label="Invändigt OK" checked={form.interior_ok} onChange={(value) => updateField("interior_ok", value)} />
                  <CheckBox label="Däck OK" checked={form.tires_ok} onChange={(value) => updateField("tires_ok", value)} />
                  <CheckBox label="Lampor OK" checked={form.lights_ok} onChange={(value) => updateField("lights_ok", value)} />
                  <CheckBox label="Bälten OK" checked={form.belts_ok} onChange={(value) => updateField("belts_ok", value)} />
                  <CheckBox label="WC OK" checked={form.wc_ok} onChange={(value) => updateField("wc_ok", value)} />
                  <CheckBox label="Dokument OK" checked={form.documents_ok} onChange={(value) => updateField("documents_ok", value)} />
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
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
                    {saving ? "Sparar..." : "Spara kontroll"}
                  </button>
                </div>
              </form>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[1fr_280px_220px_140px]">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Sök
                  </label>
                  <input
                    value={q}
                    onChange={(event) => setQ(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") loadChecks();
                    }}
                    placeholder="Sök fordon, kontrollant, skada, datum eller anteckning..."
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
                  label="Status"
                  value={status}
                  onChange={setStatus}
                  options={[
                    ["", "Alla"],
                    ["approved", "Godkända"],
                    ["needs_action", "Åtgärd krävs"],
                    ["blocked", "Får ej köras"],
                    ["draft", "Utkast"],
                  ]}
                />

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={loadChecks}
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
                    Kontrollista
                  </h2>
                  <p className="text-sm text-slate-500">
                    Visar {filteredTotal} fordonskontroller
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1220px] w-full border-collapse text-left text-sm">
                  <thead className="bg-[#194C66] text-white">
                    <tr>
                      <Th>Datum</Th>
                      <Th>Fordon</Th>
                      <Th>Kontrollerad av</Th>
                      <Th>Mätare</Th>
                      <Th>Bränsle</Th>
                      <Th>Städning</Th>
                      <Th>Punkter</Th>
                      <Th>Status</Th>
                      <Th>Anmärkning</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-8 text-center text-slate-500">
                          Laddar fordonskontroller...
                        </td>
                      </tr>
                    ) : checks.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-10 text-center">
                          <div className="mx-auto max-w-lg">
                            <div className="text-base font-bold text-[#194C66]">
                              Inga fordonskontroller hittades
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              Skapa första kontrollen med knappen Ny fordonskontroll.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      checks.map((check) => (
                        <tr key={check.id} onClick={() => router.push("/admin/fordon/status/" + encodeURIComponent(check.id))} className="cursor-pointer align-top transition hover:bg-slate-50">
                          <Td>
                            <div className="font-bold text-[#194C66]">
                              {fmtDate(check.check_date)}
                            </div>
                          </Td>

                          <Td>
                            <div className="max-w-[260px] truncate font-semibold text-slate-900">
                              {vehicleName(check.vehicle_id)}
                            </div>
                          </Td>

                          <Td>
                            <div className="font-semibold text-slate-900">
                              {check.checked_by || "—"}
                            </div>
                          </Td>

                          <Td>
                            <div className="font-semibold text-slate-900">
                              {fmtNumber(check.odometer_km)} km
                            </div>
                          </Td>

                          <Td>{conditionLabel(check.fuel_level)}</Td>
                          <Td>{conditionLabel(check.cleanliness_status)}</Td>

                          <Td>
                            <div className="flex flex-wrap gap-1">
                              <Point ok={check.exterior_ok} label="Utv." />
                              <Point ok={check.interior_ok} label="Inv." />
                              <Point ok={check.tires_ok} label="Däck" />
                              <Point ok={check.lights_ok} label="Lampor" />
                              <Point ok={check.belts_ok} label="Bälten" />
                              <Point ok={check.wc_ok} label="WC" />
                              <Point ok={check.documents_ok} label="Dok." />
                            </div>
                          </Td>

                          <Td>
                            <span
                              className={
                                "inline-flex rounded-full px-3 py-1 text-xs font-semibold " +
                                statusClass(check.status)
                              }
                            >
                              {statusLabel(check.status)}
                            </span>
                          </Td>

                          <Td>
                            <div className="max-w-[260px] truncate text-slate-600">
                              {check.damage_notes || check.notes || "—"}
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
        rows={4}
        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
      />
    </div>
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

function Point({ ok, label }: { ok?: boolean | null; label: string }) {
  return (
    <span
      className={
        "rounded-full px-2 py-1 text-[11px] font-bold " +
        (ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")
      }
    >
      {label}
    </span>
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
