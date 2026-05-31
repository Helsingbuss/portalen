import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type PartnerRow = {
  id: string;
  name?: string | null;
  partner_type?: string | null;
  city?: string | null;
  contact_person?: string | null;
};

type FormState = {
  partner_id: string;
  title: string;
  document_type: string;
  status: string;
  due_date: string;
  file_url: string;
  notes: string;
};

const emptyForm: FormState = {
  partner_id: "",
  title: "",
  document_type: "agreement",
  status: "active",
  due_date: "",
  file_url: "",
  notes: "",
};

function documentTypeLabel(type?: string | null) {
  switch (type) {
    case "agreement":
      return "Avtal";
    case "permit":
      return "Tillstånd";
    case "insurance":
      return "Försäkring";
    case "vehicle":
      return "Fordonsdokument";
    case "quality":
      return "Kvalitet";
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
    case "pending":
      return "Väntar";
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
    case "pending":
      return "bg-amber-100 text-amber-700";
    case "expired":
      return "bg-red-100 text-red-700";
    case "archived":
      return "bg-slate-100 text-slate-700";
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

function isExpired(value?: string | null) {
  if (!value) return false;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(value);
    due.setHours(0, 0, 0, 0);

    return due < today;
  } catch {
    return false;
  }
}

export default function PartnerAvtalDetailPage() {
  const router = useRouter();
  const id = String(router.query.id || "");

  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [updatedAt, setUpdatedAt] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function partnerName(id?: string | null) {
    const partner = partners.find((item) => item.id === id);
    return partner?.name || "—";
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function loadDocument() {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/partners/avtal/" + encodeURIComponent(id));
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta dokumentet.");
      }

      const document = json.document || {};

      setPartners(json.partners || []);
      setUpdatedAt(document.updated_at || "");
      setCreatedAt(document.created_at || "");

      setForm({
        partner_id: document.partner_id || "",
        title: document.title || "",
        document_type: document.document_type || "agreement",
        status: document.status || "active",
        due_date: document.due_date ? String(document.due_date).slice(0, 10) : "",
        file_url: document.file_url || "",
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

      const res = await fetch("/api/admin/partners/avtal/" + encodeURIComponent(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara dokumentet.");
      }

      setMessage("Avtal/dokument sparades.");
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
                  Operatörer & partners
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  {loading ? "Avtal & dokument" : form.title || "Dokument"}
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  {partnerName(form.partner_id)}
                  {updatedAt ? " · Uppdaterad " + new Date(updatedAt).toLocaleString("sv-SE") : ""}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/admin/partners/avtal"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Tillbaka
                </Link>

                {form.file_url && (
                  <a
                    href={form.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#00645d] shadow-sm transition hover:bg-slate-50"
                  >
                    Öppna fil
                  </a>
                )}

                <button
                  type="submit"
                  form="partner-document-edit-form"
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
              <form id="partner-document-edit-form" onSubmit={saveDocument} className="space-y-6">
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
                        {partnerName(form.partner_id)}
                        {createdAt ? " · Skapad " + new Date(createdAt).toLocaleString("sv-SE") : ""}
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

                      {form.due_date && (
                        <span
                          className={
                            "inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold " +
                            (isExpired(form.due_date)
                              ? "bg-red-100 text-red-700"
                              : "bg-[#eef8fb] text-[#194C66]")
                          }
                        >
                          Gäller till {fmtDate(form.due_date)}
                        </span>
                      )}
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Dokumentuppgifter
                  </h2>

                  <div className="mt-5 grid gap-4 lg:grid-cols-3">
                    <SelectField
                      label="Operatör / partner"
                      value={form.partner_id}
                      onChange={(value) => updateField("partner_id", value)}
                      options={[
                        ["", "Välj partner"],
                        ...partners.map((partner) => [partner.id, partner.name || "Partner"] as [string, string]),
                      ]}
                    />

                    <Field
                      label="Titel"
                      value={form.title}
                      onChange={(value) => updateField("title", value)}
                      placeholder="Ex. Ramavtal 2026"
                    />

                    <SelectField
                      label="Dokumenttyp"
                      value={form.document_type}
                      onChange={(value) => updateField("document_type", value)}
                      options={[
                        ["agreement", "Avtal"],
                        ["permit", "Tillstånd"],
                        ["insurance", "Försäkring"],
                        ["vehicle", "Fordonsdokument"],
                        ["quality", "Kvalitet"],
                        ["other", "Övrigt"],
                      ]}
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
                        ["archived", "Arkiverad"],
                      ]}
                    />

                    <Field
                      label="Gäller till"
                      type="date"
                      value={form.due_date}
                      onChange={(value) => updateField("due_date", value)}
                    />

                    <Field
                      label="Länk till fil"
                      value={form.file_url}
                      onChange={(value) => updateField("file_url", value)}
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
                    rows={7}
                    className="mt-5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                  />
                </section>

                <div className="flex justify-end gap-3">
                  <Link
                    href="/admin/partners/avtal"
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
