import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type VehicleRow = {
  id: string;
  vehicle_code?: string | null;
  registration_number?: string | null;
  model?: string | null;
  vehicle_type?: string | null;
};

type VehicleDocumentRow = {
  id: string;
  vehicle_id?: string | null;
  document_type?: string | null;
  title?: string | null;
  document_number?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  status?: string | null;
  file_url?: string | null;
  content?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type ApiResponse = {
  ok: boolean;
  needsSetup?: boolean;
  vehicles?: VehicleRow[];
  documents?: VehicleDocumentRow[];
  summary?: {
    total: number;
    documents: number;
    manuals: number;
    serviceBook: number;
    expiringSoon: number;
  };
  error?: string;
};

type FormState = {
  vehicle_id: string;
  document_type: string;
  title: string;
  document_number: string;
  issue_date: string;
  expiry_date: string;
  status: string;
  file_url: string;
  content: string;
  notes: string;
};

const emptyForm: FormState = {
  vehicle_id: "",
  document_type: "manual",
  title: "",
  document_number: "",
  issue_date: "",
  expiry_date: "",
  status: "active",
  file_url: "",
  content: "",
  notes: "",
};

const manualTypes = ["manual", "driver_instruction", "safety_instruction"];
const serviceTypes = ["service_book", "service_note"];

function documentTypeLabel(type?: string | null) {
  switch (type) {
    case "registration_certificate":
      return "Registreringsbevis";
    case "insurance_certificate":
      return "Försäkringsbevis";
    case "inspection_protocol":
      return "Besiktningsprotokoll";
    case "permit":
      return "Tillstånd";
    case "environment":
      return "Miljödokument";
    case "manual":
      return "Digital manual";
    case "driver_instruction":
      return "Förarinstruktion";
    case "safety_instruction":
      return "Säkerhetsrutin";
    case "service_book":
      return "Digital servicebok";
    case "service_note":
      return "Serviceanteckning";
    case "other":
      return "Övrigt";
    default:
      return type || "Dokument";
  }
}

function statusLabel(status?: string | null) {
  switch (status) {
    case "active":
      return "Aktiv";
    case "draft":
      return "Utkast";
    case "expired":
      return "Utgången";
    case "archived":
      return "Arkiverad";
    default:
      return status || "Ej satt";
  }
}

function statusClass(status?: string | null) {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-700";
    case "draft":
      return "bg-amber-100 text-amber-700";
    case "expired":
      return "bg-red-100 text-red-700";
    case "archived":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function typeClass(type?: string | null) {
  if (manualTypes.includes(String(type || ""))) return "bg-blue-100 text-blue-700";
  if (serviceTypes.includes(String(type || ""))) return "bg-[#eef8fb] text-[#194C66]";

  switch (type) {
    case "permit":
      return "bg-amber-100 text-amber-700";
    case "insurance_certificate":
      return "bg-emerald-100 text-emerald-700";
    case "inspection_protocol":
      return "bg-purple-100 text-purple-700";
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


function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Kunde inte läsa filen."));

    reader.readAsDataURL(file);
  });
}

export default function FordonDokumentPage() {
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [documents, setDocuments] = useState<VehicleDocumentRow[]>([]);
  const [summary, setSummary] = useState<ApiResponse["summary"]>({
    total: 0,
    documents: 0,
    manuals: 0,
    serviceBook: 0,
    expiringSoon: 0,
  });

  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [documentType, setDocumentType] = useState("");
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

  async function loadDocuments() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      if (documentType) params.set("document_type", documentType);
      if (vehicleId) params.set("vehicle_id", vehicleId);

      const res = await fetch("/api/admin/fordon/dokument?" + params.toString());
      const json: ApiResponse = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta dokument och tillstånd.");
      }

      setVehicles(json.vehicles || []);
      setDocuments(json.documents || []);
      setSummary(
        json.summary || {
          total: 0,
          documents: 0,
          manuals: 0,
          serviceBook: 0,
          expiringSoon: 0,
        }
      );
      setNeedsSetup(Boolean(json.needsSetup));

      if (!vehicleId && json.vehicles && json.vehicles.length > 0) {
        const firstVehicleId = json.vehicles[0].id;
        setVehicleId(firstVehicleId);
        setForm((prev) => ({ ...prev, vehicle_id: firstVehicleId }));
      }
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }


  async function uploadSelectedFile(file: File | null, vehicleIdForUpload: string) {
    if (!file) return null;

    const base64 = await fileToBase64(file);

    const res = await fetch("/api/admin/fordon/dokument/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        vehicle_id: vehicleIdForUpload,
        file_name: file.name,
        content_type: file.type || "application/octet-stream",
        base64,
      }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json.ok) {
      throw new Error(json.error || "Kunde inte ladda upp filen.");
    }

    return String(json.file_url || "");
  }

  async function createDocument(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const vehicleIdForPayload = form.vehicle_id || vehicleId;
      const uploadedUrl = await uploadSelectedFile(selectedFile, vehicleIdForPayload);

      const payload = {
        ...form,
        vehicle_id: vehicleIdForPayload,
        file_url: uploadedUrl || form.file_url,
      };

      const res = await fetch("/api/admin/fordon/dokument", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara dokumentet.");
      }

      setMessage("Dokument/manual/servicebok sparades.");
      setForm({
        ...emptyForm,
        vehicle_id: payload.vehicle_id,
      });
      setSelectedFile(null);
      setShowForm(false);
      await loadDocuments();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara dokumentet.");
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
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId);

  const visibleDocuments = useMemo(() => documents, [documents]);

  const regularDocuments = visibleDocuments.filter(
    (document) =>
      !manualTypes.includes(String(document.document_type || "")) &&
      !serviceTypes.includes(String(document.document_type || ""))
  );

  const manuals = visibleDocuments.filter((document) =>
    manualTypes.includes(String(document.document_type || ""))
  );

  const serviceBook = visibleDocuments.filter((document) =>
    serviceTypes.includes(String(document.document_type || ""))
  );

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
                  Dokument & tillstånd
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Digital fordonsmapp med dokument, tillstånd, manualer och servicebok nära valt fordon.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, vehicle_id: prev.vehicle_id || vehicleId }));
                    setShowForm((value) => !value);
                  }}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49]"
                >
                  {showForm ? "Stäng formulär" : "Nytt dokument"}
                </button>

                <button
                  type="button"
                  onClick={loadDocuments}
                  className="inline-flex items-center justify-center rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3548]"
                >
                  Uppdatera
                </button>
              </div>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[1fr_220px_220px_140px]">
                <SelectField
                  label="Välj fordon"
                  value={vehicleId}
                  onChange={(value) => {
                    setVehicleId(value);
                    updateField("vehicle_id", value);
                  }}
                  options={[
                    ["", "Alla fordon"],
                    ...vehicles.map((vehicle) => [
                      vehicle.id,
                      [vehicle.vehicle_code, vehicle.registration_number, vehicle.model].filter(Boolean).join(" · ") || "Fordon",
                    ] as [string, string]),
                  ]}
                />

                <SelectField
                  label="Typ"
                  value={documentType}
                  onChange={setDocumentType}
                  options={[
                    ["", "Alla"],
                    ["registration_certificate", "Registreringsbevis"],
                    ["insurance_certificate", "Försäkringsbevis"],
                    ["inspection_protocol", "Besiktningsprotokoll"],
                    ["permit", "Tillstånd"],
                    ["environment", "Miljödokument"],
                    ["manual", "Digital manual"],
                    ["driver_instruction", "Förarinstruktion"],
                    ["safety_instruction", "Säkerhetsrutin"],
                    ["service_book", "Digital servicebok"],
                    ["service_note", "Serviceanteckning"],
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
                    ["expired", "Utgångna"],
                    ["archived", "Arkiverade"],
                  ]}
                />

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={loadDocuments}
                    className="w-full rounded-xl bg-[#00645d] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#004f49]"
                  >
                    Filtrera
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Sök
                </label>
                <input
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") loadDocuments();
                  }}
                  placeholder="Sök dokument, manual, servicebok, dokumentnummer eller anteckning..."
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                />
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

            <div className="grid gap-4 md:grid-cols-5">
              <SummaryCard label="Totalt" value={summary?.total || 0} />
              <SummaryCard label="Dokument" value={summary?.documents || 0} tone="blue" />
              <SummaryCard label="Manualer" value={summary?.manuals || 0} tone="green" />
              <SummaryCard label="Servicebok" value={summary?.serviceBook || 0} tone="slate" />
              <SummaryCard label="Går ut snart" value={summary?.expiringSoon || 0} tone="amber" />
            </div>

            {selectedVehicle && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#00645d]">
                  Vald fordonsmapp
                </p>
                <h2 className="mt-2 text-2xl font-bold text-[#194C66]">
                  {vehicleName(selectedVehicle.id)}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Här visas dokument, manualer och servicebok kopplat till valt fordon.
                </p>
              </section>
            )}

            {needsSetup && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800 shadow-sm">
                <h2 className="text-base font-bold">
                  Dokumenttabellen saknas ännu
                </h2>
                <p className="mt-2 text-sm leading-6">
                  Tabellen <strong>vehicle_documents</strong> saknas i databasen. Kör SQL-koden nedan så kan dokument, manualer och servicebok sparas.
                </p>
              </section>
            )}

            {showForm && (
              <form
                onSubmit={createDocument}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-2 border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Nytt dokument / manual / servicebok
                  </h2>
                  <p className="text-sm text-slate-500">
                    Välj fordon och skapa ett vanligt dokument, en digital manual eller en serviceboksanteckning.
                  </p>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-4">
                  <SelectField
                    label="Fordon"
                    value={form.vehicle_id || vehicleId}
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
                    label="Typ"
                    value={form.document_type}
                    onChange={(value) => updateField("document_type", value)}
                    options={[
                      ["registration_certificate", "Registreringsbevis"],
                      ["insurance_certificate", "Försäkringsbevis"],
                      ["inspection_protocol", "Besiktningsprotokoll"],
                      ["permit", "Tillstånd"],
                      ["environment", "Miljödokument"],
                      ["manual", "Digital manual"],
                      ["driver_instruction", "Förarinstruktion"],
                      ["safety_instruction", "Säkerhetsrutin"],
                      ["service_book", "Digital servicebok"],
                      ["service_note", "Serviceanteckning"],
                      ["other", "Övrigt"],
                    ]}
                  />

                  <Field
                    label="Titel"
                    value={form.title}
                    onChange={(value) => updateField("title", value)}
                    placeholder="Ex. Förarmanual Tourismo"
                  />

                  <Field
                    label="Dokumentnummer"
                    value={form.document_number}
                    onChange={(value) => updateField("document_number", value)}
                    placeholder="Ex. REG-123"
                  />

                  <Field
                    label="Utfärdat datum"
                    type="date"
                    value={form.issue_date}
                    onChange={(value) => updateField("issue_date", value)}
                  />

                  <Field
                    label="Gäller till"
                    type="date"
                    value={form.expiry_date}
                    onChange={(value) => updateField("expiry_date", value)}
                  />

                  <SelectField
                    label="Status"
                    value={form.status}
                    onChange={(value) => updateField("status", value)}
                    options={[
                      ["active", "Aktiv"],
                      ["draft", "Utkast"],
                      ["expired", "Utgången"],
                      ["archived", "Arkiverad"],
                    ]}
                  />

                  <Field
                    label="Fil-/dokumentlänk"
                    value={form.file_url}
                    onChange={(value) => updateField("file_url", value)}
                    placeholder="https://..."
                  />

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Ladda upp fil
                    </label>
                    <input
                      type="file"
                      onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                      className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-[#eef8fb] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#194C66]"
                    />
                    {selectedFile && (
                      <p className="mt-2 text-xs font-semibold text-[#00645d]">
                        Vald fil: {selectedFile.name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <TextArea
                    label="Digitalt innehåll"
                    value={form.content}
                    onChange={(value) => updateField("content", value)}
                    placeholder="Skriv manual, instruktion, servicebok eller viktiga rutiner direkt här..."
                  />

                  <TextArea
                    label="Anteckningar"
                    value={form.notes}
                    onChange={(value) => updateField("notes", value)}
                    placeholder="Interna anteckningar..."
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
                    {saving ? "Sparar..." : "Spara"}
                  </button>
                </div>
              </form>
            )}

            <DocumentSection title="Dokument & tillstånd" items={regularDocuments} vehicleName={vehicleName} />
            <DocumentSection title="Digitala manualer" items={manuals} vehicleName={vehicleName} />
            <DocumentSection title="Digital servicebok" items={serviceBook} vehicleName={vehicleName} />
          </div>
        </main>
      </div>
    </>
  );
}

function DocumentSection({
  title,
  items,
  vehicleName,
}: {
  title: string;
  items: VehicleDocumentRow[];
  vehicleName: (id?: string | null) => string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="text-lg font-bold text-[#194C66]">{title}</h2>
          <p className="text-sm text-slate-500">Visar {items.length} poster</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1180px] w-full border-collapse text-left text-sm">
          <thead className="bg-[#194C66] text-white">
            <tr>
              <Th>Titel</Th>
              <Th>Fordon</Th>
              <Th>Typ</Th>
              <Th>Dok.nr</Th>
              <Th>Datum</Th>
              <Th>Status</Th>
              <Th>Fil</Th>
              <Th>Innehåll / anteckning</Th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-slate-500">
                  Inga poster här ännu.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} onClick={() => { window.location.href = "/admin/fordon/dokument/" + encodeURIComponent(item.id); }} className="cursor-pointer align-top transition hover:bg-slate-50">
                  <Td>
                    <div className="font-bold text-[#194C66]">
                      {item.title || "Dokument"}
                    </div>
                  </Td>

                  <Td>
                    <div className="max-w-[230px] truncate font-semibold text-slate-900">
                      {vehicleName(item.vehicle_id)}
                    </div>
                  </Td>

                  <Td>
                    <span
                      className={
                        "inline-flex rounded-full px-3 py-1 text-xs font-semibold " +
                        typeClass(item.document_type)
                      }
                    >
                      {documentTypeLabel(item.document_type)}
                    </span>
                  </Td>

                  <Td>{item.document_number || "—"}</Td>

                  <Td>
                    <div className="text-slate-700">
                      {fmtDate(item.issue_date)} – {fmtDate(item.expiry_date)}
                    </div>
                    {isExpiringSoon(item.expiry_date) && item.status === "active" && (
                      <div className="mt-1 text-xs font-semibold text-amber-700">
                        Går ut snart
                      </div>
                    )}
                  </Td>

                  <Td>
                    <span
                      className={
                        "inline-flex rounded-full px-3 py-1 text-xs font-semibold " +
                        statusClass(item.status)
                      }
                    >
                      {statusLabel(item.status)}
                    </span>
                  </Td>

                  <Td>
                    {item.file_url ? (
                      <a
                        href={String(item.file_url).startsWith("http") ? item.file_url : "https://" + item.file_url}
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
                    <div className="max-w-[300px] truncate text-slate-600">
                      {item.content || item.notes || "—"}
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
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
        rows={6}
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
