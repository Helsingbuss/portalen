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
  const manualTypes = ["manual", "driver_instruction", "safety_instruction"];
  const serviceTypes = ["service_book", "service_note"];

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

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Kunde inte läsa filen."));

    reader.readAsDataURL(file);
  });
}

export default function FordonDokumentDetailPage() {
  const router = useRouter();
  const id = String(router.query.id || "");

  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

  async function uploadSelectedFile(file: File | null) {
    if (!file) return null;

    const base64 = await fileToBase64(file);

    const res = await fetch("/api/admin/fordon/dokument/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        vehicle_id: form.vehicle_id,
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

  async function loadDocument() {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/fordon/dokument/" + encodeURIComponent(id));
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta dokumentet.");
      }

      const document = json.document || {};

      setVehicles(json.vehicles || []);
      setCreatedAt(document.created_at || "");
      setUpdatedAt(document.updated_at || "");

      setForm({
        vehicle_id: document.vehicle_id || "",
        document_type: document.document_type || "other",
        title: document.title || "",
        document_number: document.document_number || "",
        issue_date: document.issue_date ? String(document.issue_date).slice(0, 10) : "",
        expiry_date: document.expiry_date ? String(document.expiry_date).slice(0, 10) : "",
        status: document.status || "active",
        file_url: document.file_url || "",
        content: document.content || "",
        notes: document.notes || "",
      });
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function saveDocument(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const uploadedUrl = await uploadSelectedFile(selectedFile);

      const payload = {
        ...form,
        file_url: uploadedUrl || form.file_url,
      };

      const res = await fetch("/api/admin/fordon/dokument/" + encodeURIComponent(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara dokumentet.");
      }

      setSelectedFile(null);
      setMessage("Dokumentet sparades.");
      await loadDocument();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara dokumentet.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadDocument();
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
                  {loading ? "Dokument & tillstånd" : form.title || "Dokument"}
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  {selectedVehicleName()}
                  {updatedAt ? " · Uppdaterad " + new Date(updatedAt).toLocaleString("sv-SE") : ""}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/admin/fordon/dokument"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Tillbaka
                </Link>

                {form.file_url && (
                  <a
                    href={String(form.file_url).startsWith("http") ? form.file_url : "https://" + form.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#00645d] shadow-sm transition hover:bg-slate-50"
                  >
                    Öppna fil
                  </a>
                )}

                <button
                  type="submit"
                  form="vehicle-document-edit-form"
                  disabled={saving || loading}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Sparar..." : "Spara dokument"}
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
                Laddar dokument...
              </section>
            ) : (
              <form id="vehicle-document-edit-form" onSubmit={saveDocument} className="space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {documentTypeLabel(form.document_type)}
                      </div>

                      <h2 className="mt-2 text-2xl font-bold text-[#194C66]">
                        {form.title || "Dokument"}
                      </h2>

                      <p className="mt-2 text-sm text-slate-600">
                        {selectedVehicleName()} · {form.document_number || "Dokumentnummer saknas"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className={"inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold " + typeClass(form.document_type)}>
                        {documentTypeLabel(form.document_type)}
                      </span>

                      <span className={"inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold " + statusClass(form.status)}>
                        {statusLabel(form.status)}
                      </span>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Dokumentuppgifter
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

                    <Field label="Titel" value={form.title} onChange={(value) => updateField("title", value)} />
                    <Field label="Dokumentnummer" value={form.document_number} onChange={(value) => updateField("document_number", value)} />
                    <Field label="Utfärdat datum" type="date" value={form.issue_date} onChange={(value) => updateField("issue_date", value)} />
                    <Field label="Gäller till" type="date" value={form.expiry_date} onChange={(value) => updateField("expiry_date", value)} />

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

                    <Field label="Fil-/dokumentlänk" value={form.file_url} onChange={(value) => updateField("file_url", value)} />

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Ladda upp ny fil
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
                </section>

                <section className="grid gap-6 lg:grid-cols-2">
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
                    href="/admin/fordon/dokument"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                  >
                    Avbryt
                  </Link>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Sparar..." : "Spara dokument"}
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
