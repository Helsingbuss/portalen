import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
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

type DocumentRow = {
  id: string;
  partner_id?: string | null;
  title?: string | null;
  document_type?: string | null;
  status?: string | null;
  due_date?: string | null;
  file_url?: string | null;
  notes?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

type ApiResponse = {
  ok: boolean;
  needsSetup?: boolean;
  partners?: PartnerRow[];
  documents?: DocumentRow[];
  summary?: {
    total: number;
    active: number;
    expired: number;
    agreements: number;
  };
  error?: string;
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
    case "expired":
      return "Utgången";
    case "archived":
      return "Arkiverad";
    case "pending":
      return "Väntar";
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

export default function PartnerAvtalDokumentPage() {
  const router = useRouter();
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [summary, setSummary] = useState<ApiResponse["summary"]>({
    total: 0,
    active: 0,
    expired: 0,
    agreements: 0,
  });
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [q, setQ] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [status, setStatus] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function partnerName(id?: string | null) {
    const partner = partners.find((item) => item.id === id);
    return partner?.name || "—";
  }

  async function loadDocuments() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (q.trim()) params.set("q", q.trim());
      if (partnerId) params.set("partner_id", partnerId);
      if (status) params.set("status", status);
      if (documentType) params.set("document_type", documentType);

      const res = await fetch("/api/admin/partners/avtal?" + params.toString());
      const json: ApiResponse = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta avtal och dokument.");
      }

      setPartners(json.partners || []);
      setDocuments(json.documents || []);
      setSummary(json.summary || { total: 0, active: 0, expired: 0, agreements: 0 });
      setNeedsSetup(Boolean(json.needsSetup));
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function createDocument(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/partners/avtal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte skapa dokument.");
      }

      setMessage("Avtal/dokument sparades.");
      setForm(emptyForm);
      setShowForm(false);
      await loadDocuments();
    } catch (err: any) {
      setError(err?.message || "Kunde inte skapa dokument.");
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

  const filteredTotal = useMemo(() => documents.length, [documents]);

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
                  Avtal & dokument
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Här samlar du avtal, försäkringar, tillstånd och dokument kopplade till operatörer och partners. Samma data används även i adminappen.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm((value) => !value)}
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

            <div className="grid gap-4 md:grid-cols-4">
              <SummaryCard label="Totalt" value={summary?.total || 0} />
              <SummaryCard label="Aktiva" value={summary?.active || 0} tone="green" />
              <SummaryCard label="Avtal" value={summary?.agreements || 0} tone="blue" />
              <SummaryCard label="Utgångna" value={summary?.expired || 0} tone="red" />
            </div>

            {needsSetup && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800 shadow-sm">
                <h2 className="text-base font-bold">
                  Appens dokumenttabell saknas ännu
                </h2>
                <p className="mt-2 text-sm leading-6">
                  Tabellen <strong>app_partner_documents</strong> saknas i databasen. Eftersom appen redan är byggd mot den tabellen bör vi skapa/återställa den.
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
                    Nytt avtal/dokument
                  </h2>
                  <p className="text-sm text-slate-500">
                    Välj partner, typ av dokument, status och eventuell giltighetstid.
                  </p>
                </div>

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
                    {saving ? "Sparar..." : "Spara dokument"}
                  </button>
                </div>
              </form>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[1fr_260px_220px_220px_140px]">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Sök
                  </label>
                  <input
                    value={q}
                    onChange={(event) => setQ(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") loadDocuments();
                    }}
                    placeholder="Sök avtal, dokument, partner eller anteckning..."
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                  />
                </div>

                <SelectField
                  label="Partner"
                  value={partnerId}
                  onChange={setPartnerId}
                  options={[
                    ["", "Alla partners"],
                    ...partners.map((partner) => [partner.id, partner.name || "Partner"] as [string, string]),
                  ]}
                />

                <SelectField
                  label="Typ"
                  value={documentType}
                  onChange={setDocumentType}
                  options={[
                    ["", "Alla"],
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
                  value={status}
                  onChange={setStatus}
                  options={[
                    ["", "Alla"],
                    ["active", "Aktiva"],
                    ["draft", "Utkast"],
                    ["pending", "Väntar"],
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
                    Dokumentlista
                  </h2>
                  <p className="text-sm text-slate-500">
                    Visar {filteredTotal} dokument
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1160px] w-full border-collapse text-left text-sm">
                  <thead className="bg-[#194C66] text-white">
                    <tr>
                      <Th>Titel</Th>
                      <Th>Partner</Th>
                      <Th>Typ</Th>
                      <Th>Status</Th>
                      <Th>Gäller till</Th>
                      <Th>Fil</Th>
                      <Th>Anteckning</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                          Laddar avtal och dokument...
                        </td>
                      </tr>
                    ) : documents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-10 text-center">
                          <div className="mx-auto max-w-lg">
                            <div className="text-base font-bold text-[#194C66]">
                              Inga avtal eller dokument hittades
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              Skapa första dokumentet med knappen Nytt dokument.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      documents.map((document) => (
                        <tr key={document.id} onClick={() => router.push("/admin/partners/avtal/" + encodeURIComponent(document.id))} className="cursor-pointer align-top transition hover:bg-slate-50">
                          <Td>
                            <div className="font-bold text-[#194C66]">
                              {document.title || "Dokument"}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              Uppdaterad {fmtDate(document.updated_at)}
                            </div>
                          </Td>

                          <Td>
                            <div className="max-w-[220px] truncate font-semibold text-slate-900">
                              {partnerName(document.partner_id)}
                            </div>
                          </Td>

                          <Td>
                            <span className="rounded-full bg-[#eef8fb] px-3 py-1 text-xs font-semibold text-[#194C66]">
                              {documentTypeLabel(document.document_type)}
                            </span>
                          </Td>

                          <Td>
                            <span
                              className={
                                "inline-flex rounded-full px-3 py-1 text-xs font-semibold " +
                                statusClass(document.status)
                              }
                            >
                              {statusLabel(document.status)}
                            </span>
                          </Td>

                          <Td>
                            <div
                              className={
                                "font-semibold " +
                                (isExpired(document.due_date) ? "text-red-700" : "text-slate-900")
                              }
                            >
                              {fmtDate(document.due_date)}
                            </div>
                            {isExpired(document.due_date) && (
                              <div className="mt-1 text-xs font-semibold text-red-600">
                                Har gått ut
                              </div>
                            )}
                          </Td>

                          <Td>
                            {document.file_url ? (
                              <a
                                href={document.file_url}
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
                              {document.notes || "—"}
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
