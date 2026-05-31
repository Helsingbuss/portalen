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
};

type ContractRow = {
  id: string;
  vehicle_id?: string | null;
  contract_type?: string | null;
  supplier?: string | null;
  contract_number?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  monthly_cost?: number | null;
  deductible_amount?: number | null;
  status?: string | null;
  document_url?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type ApiResponse = {
  ok: boolean;
  needsSetup?: boolean;
  vehicles?: VehicleRow[];
  contracts?: ContractRow[];
  summary?: {
    total: number;
    active: number;
    expiringSoon: number;
    insurance: number;
    leasing: number;
    monthlyCost: number;
  };
  error?: string;
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

function fmtMoney(value?: number | null) {
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

export default function FordonAvtalPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [summary, setSummary] = useState<ApiResponse["summary"]>({
    total: 0,
    active: 0,
    expiringSoon: 0,
    insurance: 0,
    leasing: 0,
    monthlyCost: 0,
  });

  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [contractType, setContractType] = useState("");
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
      .join(" · ") || "Fordon";
  }

  async function loadContracts() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      if (contractType) params.set("contract_type", contractType);
      if (vehicleId) params.set("vehicle_id", vehicleId);

      const res = await fetch("/api/admin/fordon/avtal?" + params.toString());
      const json: ApiResponse = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta försäkring och leasing.");
      }

      setVehicles(json.vehicles || []);
      setContracts(json.contracts || []);
      setSummary(
        json.summary || {
          total: 0,
          active: 0,
          expiringSoon: 0,
          insurance: 0,
          leasing: 0,
          monthlyCost: 0,
        }
      );
      setNeedsSetup(Boolean(json.needsSetup));
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function createContract(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/fordon/avtal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara avtalet.");
      }

      setMessage("Försäkring/leasing-avtalet sparades.");
      setForm(emptyForm);
      setShowForm(false);
      await loadContracts();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara avtalet.");
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
    loadContracts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTotal = useMemo(() => contracts.length, [contracts]);

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
                  Försäkring & leasing
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Här samlar du försäkringar, leasingavtal, finansavtal och serviceavtal kopplade till Helsingbuss egna fordon.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm((value) => !value)}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49]"
                >
                  {showForm ? "Stäng formulär" : "Nytt avtal"}
                </button>

                <button
                  type="button"
                  onClick={loadContracts}
                  className="inline-flex items-center justify-center rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3548]"
                >
                  Uppdatera
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-6">
              <SummaryCard label="Totalt" value={summary?.total || 0} />
              <SummaryCard label="Aktiva" value={summary?.active || 0} tone="green" />
              <SummaryCard label="Går ut snart" value={summary?.expiringSoon || 0} tone="amber" />
              <SummaryCard label="Försäkringar" value={summary?.insurance || 0} tone="blue" />
              <SummaryCard label="Leasing" value={summary?.leasing || 0} tone="blue" />
              <SummaryCard label="Mån.kostnad" valueText={fmtMoney(summary?.monthlyCost || 0)} tone="slate" />
            </div>

            {needsSetup && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800 shadow-sm">
                <h2 className="text-base font-bold">
                  Avtalstabellen saknas ännu
                </h2>
                <p className="mt-2 text-sm leading-6">
                  Tabellen <strong>vehicle_contracts</strong> saknas i databasen. Kör SQL-koden nedan så kan försäkring och leasing sparas.
                </p>
              </section>
            )}

            {showForm && (
              <form
                onSubmit={createContract}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-2 border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Nytt fordonsavtal
                  </h2>
                  <p className="text-sm text-slate-500">
                    Välj fordon, avtalstyp, leverantör, datum, kostnader och eventuell dokumentlänk.
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
                    placeholder="Ex. Försäkringsbolag / leasingbolag"
                  />

                  <Field
                    label="Avtalsnummer"
                    value={form.contract_number}
                    onChange={(value) => updateField("contract_number", value)}
                    placeholder="Avtalsnummer"
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
                    placeholder="Ex. 12500"
                  />

                  <Field
                    label="Självrisk"
                    value={form.deductible_amount}
                    onChange={(value) => updateField("deductible_amount", value)}
                    placeholder="Ex. 10000"
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

                <div className="mt-4">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Anteckningar
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    rows={4}
                    placeholder="Ex. villkor, uppsägningstid, kontaktperson, särskilda krav..."
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
                    {saving ? "Sparar..." : "Spara avtal"}
                  </button>
                </div>
              </form>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[1fr_280px_200px_200px_140px]">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Sök
                  </label>
                  <input
                    value={q}
                    onChange={(event) => setQ(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") loadContracts();
                    }}
                    placeholder="Sök fordon, leverantör, avtalsnummer eller anteckning..."
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
                  label="Avtalstyp"
                  value={contractType}
                  onChange={setContractType}
                  options={[
                    ["", "Alla"],
                    ["insurance", "Försäkring"],
                    ["leasing", "Leasing"],
                    ["finance", "Finans"],
                    ["service_agreement", "Serviceavtal"],
                    ["warranty", "Garanti"],
                    ["other", "Övrigt"],
                  ]}
                />

                <SelectField
                  label="Status"
                  value={status}
                  onChange={setStatus}
                  options={[
                    ["", "Alla"],
                    ["active", "Aktiva"],
                    ["draft", "Utkast"],
                    ["pending", "Väntar"],
                    ["expired", "Utgångna"],
                    ["cancelled", "Avslutade"],
                  ]}
                />

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={loadContracts}
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
                    Fordonsavtal
                  </h2>
                  <p className="text-sm text-slate-500">
                    Visar {filteredTotal} avtal
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1240px] w-full border-collapse text-left text-sm">
                  <thead className="bg-[#194C66] text-white">
                    <tr>
                      <Th>Fordon</Th>
                      <Th>Typ</Th>
                      <Th>Leverantör</Th>
                      <Th>Avtalsnummer</Th>
                      <Th>Period</Th>
                      <Th>Månadskostnad</Th>
                      <Th>Status</Th>
                      <Th>Dokument</Th>
                      <Th>Anteckning</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-8 text-center text-slate-500">
                          Laddar försäkring och leasing...
                        </td>
                      </tr>
                    ) : contracts.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-10 text-center">
                          <div className="mx-auto max-w-lg">
                            <div className="text-base font-bold text-[#194C66]">
                              Inga fordonsavtal hittades
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              Skapa första avtalet med knappen Nytt avtal.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      contracts.map((contract) => (
                        <tr key={contract.id} onClick={() => router.push("/admin/fordon/avtal/" + encodeURIComponent(contract.id))} className="cursor-pointer align-top transition hover:bg-slate-50">
                          <Td>
                            <div className="max-w-[240px] truncate font-semibold text-slate-900">
                              {vehicleName(contract.vehicle_id)}
                            </div>
                          </Td>

                          <Td>
                            <span
                              className={
                                "inline-flex rounded-full px-3 py-1 text-xs font-semibold " +
                                typeClass(contract.contract_type)
                              }
                            >
                              {contractTypeLabel(contract.contract_type)}
                            </span>
                          </Td>

                          <Td>
                            <div className="max-w-[220px] truncate font-bold text-[#194C66]">
                              {contract.supplier || "—"}
                            </div>
                          </Td>

                          <Td>{contract.contract_number || "—"}</Td>

                          <Td>
                            <div className="text-slate-700">
                              {fmtDate(contract.start_date)} – {fmtDate(contract.end_date)}
                            </div>
                            {isExpiringSoon(contract.end_date) && contract.status === "active" && (
                              <div className="mt-1 text-xs font-semibold text-amber-700">
                                Går ut snart
                              </div>
                            )}
                          </Td>

                          <Td>
                            <div className="font-semibold text-slate-900">
                              {fmtMoney(contract.monthly_cost)}
                            </div>
                          </Td>

                          <Td>
                            <span
                              className={
                                "inline-flex rounded-full px-3 py-1 text-xs font-semibold " +
                                statusClass(contract.status)
                              }
                            >
                              {statusLabel(contract.status)}
                            </span>
                          </Td>

                          <Td>
                            {contract.document_url ? (
                              <a
                                href={String(contract.document_url).startsWith("http") ? contract.document_url : "https://" + contract.document_url}
                                onClick={(event) => event.stopPropagation()}
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-[#00645d] hover:underline"
                              >
                                Öppna
                              </a>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </Td>

                          <Td>
                            <div className="max-w-[260px] truncate text-slate-600">
                              {contract.notes || "—"}
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
  valueText,
  tone,
}: {
  label: string;
  value?: number;
  valueText?: string;
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
      <div className="mt-2 text-2xl font-bold">{valueText || value || 0}</div>
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
