import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type ContactRow = {
  id: string;
  contact_number?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  company_name?: string | null;
  org_number?: string | null;
  role_title?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
  contact_type?: string | null;
  status?: string | null;
  source?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  created_at?: string | null;
};

type ApiResponse = {
  ok: boolean;
  needsSetup?: boolean;
  contacts?: ContactRow[];
  summary?: {
    total: number;
    active: number;
    leads: number;
    companies: number;
  };
  error?: string;
};

type FormState = {
  first_name: string;
  last_name: string;
  company_name: string;
  org_number: string;
  role_title: string;
  email: string;
  phone: string;
  mobile: string;
  address: string;
  postal_code: string;
  city: string;
  country: string;
  contact_type: string;
  status: string;
  source: string;
  notes: string;
  tags: string;
};

const emptyForm: FormState = {
  first_name: "",
  last_name: "",
  company_name: "",
  org_number: "",
  role_title: "",
  email: "",
  phone: "",
  mobile: "",
  address: "",
  postal_code: "",
  city: "",
  country: "Sverige",
  contact_type: "customer",
  status: "active",
  source: "",
  notes: "",
  tags: "",
};

function typeLabel(type?: string | null) {
  switch (type) {
    case "customer":
      return "Kund";
    case "company":
      return "Företag";
    case "association":
      return "Förening";
    case "partner":
      return "Partner";
    case "supplier":
      return "Leverantör";
    case "agent":
      return "Agent";
    case "private":
      return "Privatperson";
    default:
      return type || "Kontakt";
  }
}

function statusLabel(status?: string | null) {
  switch (status) {
    case "active":
      return "Aktiv";
    case "lead":
      return "Lead";
    case "inactive":
      return "Inaktiv";
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
    case "lead":
      return "bg-blue-100 text-blue-700";
    case "inactive":
      return "bg-slate-100 text-slate-700";
    case "blocked":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function displayName(contact: ContactRow) {
  const name =
    contact.full_name ||
    [contact.first_name, contact.last_name].filter(Boolean).join(" ").trim();

  return name || contact.company_name || "Kontakt";
}

export default function CrmKontakterPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [summary, setSummary] = useState<ApiResponse["summary"]>({
    total: 0,
    active: 0,
    leads: 0,
    companies: 0,
  });
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadContacts() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      if (type) params.set("type", type);

      const res = await fetch("/api/admin/crm/kontakter?" + params.toString());
      const json: ApiResponse = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta kontakter.");
      }

      setContacts(json.contacts || []);
      setSummary(json.summary || { total: 0, active: 0, leads: 0, companies: 0 });
      setNeedsSetup(Boolean(json.needsSetup));
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function createContact(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/crm/kontakter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte skapa kontakt.");
      }

      setMessage("Kontakten skapades.");
      setForm(emptyForm);
      setShowForm(false);
      await loadContacts();
    } catch (err: any) {
      setError(err?.message || "Kunde inte skapa kontakt.");
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
    loadContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTotal = useMemo(() => contacts.length, [contacts]);

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
                  CRM
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  Kontakter & noteringar
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Här samlar du kunder, företag, föreningar, partners, leverantörer och kontaktpersoner.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm((value) => !value)}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49]"
                >
                  {showForm ? "Stäng formulär" : "Ny kontakt"}
                </button>

                <button
                  type="button"
                  onClick={loadContacts}
                  className="inline-flex items-center justify-center rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3548]"
                >
                  Uppdatera
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <SummaryCard label="Totalt" value={summary?.total || 0} />
              <SummaryCard label="Aktiva" value={summary?.active || 0} tone="green" />
              <SummaryCard label="Leads" value={summary?.leads || 0} tone="blue" />
              <SummaryCard label="Företag" value={summary?.companies || 0} tone="amber" />
            </div>

            {needsSetup && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800 shadow-sm">
                <h2 className="text-base font-bold">
                  Databastabellen för CRM-kontakter saknas ännu
                </h2>
                <p className="mt-2 text-sm leading-6">
                  Kör SQL-filen <strong>crm-kontakter-table.sql</strong> i Supabase SQL Editor.
                  När tabellen finns kan kontakter skapas och visas här.
                </p>
              </section>
            )}

            {showForm && (
              <form
                onSubmit={createContact}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-2 border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Ny kontakt
                  </h2>
                  <p className="text-sm text-slate-500">
                    Lägg in kontaktuppgifter, kategori, status och noteringar.
                  </p>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  <Field label="Förnamn" value={form.first_name} onChange={(value) => updateField("first_name", value)} />
                  <Field label="Efternamn" value={form.last_name} onChange={(value) => updateField("last_name", value)} />
                  <Field label="Företag / organisation" value={form.company_name} onChange={(value) => updateField("company_name", value)} />

                  <Field label="Org.nr" value={form.org_number} onChange={(value) => updateField("org_number", value)} />
                  <Field label="Roll / titel" value={form.role_title} onChange={(value) => updateField("role_title", value)} />
                  <Field label="Källa" value={form.source} onChange={(value) => updateField("source", value)} placeholder="Ex. offert, telefon, kundmöte" />

                  <Field label="E-post" value={form.email} onChange={(value) => updateField("email", value)} />
                  <Field label="Telefon" value={form.phone} onChange={(value) => updateField("phone", value)} />
                  <Field label="Mobil" value={form.mobile} onChange={(value) => updateField("mobile", value)} />

                  <Field label="Adress" value={form.address} onChange={(value) => updateField("address", value)} />
                  <Field label="Postnummer" value={form.postal_code} onChange={(value) => updateField("postal_code", value)} />
                  <Field label="Ort" value={form.city} onChange={(value) => updateField("city", value)} />

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Typ
                    </label>
                    <select
                      value={form.contact_type}
                      onChange={(event) => updateField("contact_type", event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                    >
                      <option value="customer">Kund</option>
                      <option value="company">Företag</option>
                      <option value="association">Förening</option>
                      <option value="partner">Partner</option>
                      <option value="supplier">Leverantör</option>
                      <option value="agent">Agent</option>
                      <option value="private">Privatperson</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </label>
                    <select
                      value={form.status}
                      onChange={(event) => updateField("status", event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                    >
                      <option value="active">Aktiv</option>
                      <option value="lead">Lead</option>
                      <option value="inactive">Inaktiv</option>
                      <option value="blocked">Blockerad</option>
                    </select>
                  </div>

                  <Field label="Taggar" value={form.tags} onChange={(value) => updateField("tags", value)} placeholder="Ex. bröllop, förening, återkommande" />
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
                    {saving ? "Sparar..." : "Spara kontakt"}
                  </button>
                </div>
              </form>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[1fr_220px_220px_140px]">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Sök
                  </label>
                  <input
                    value={q}
                    onChange={(event) => setQ(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") loadContacts();
                    }}
                    placeholder="Sök namn, företag, e-post, telefon eller taggar..."
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                  >
                    <option value="">Alla</option>
                    <option value="active">Aktiva</option>
                    <option value="lead">Leads</option>
                    <option value="inactive">Inaktiva</option>
                    <option value="blocked">Blockerade</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Typ
                  </label>
                  <select
                    value={type}
                    onChange={(event) => setType(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                  >
                    <option value="">Alla</option>
                    <option value="customer">Kund</option>
                    <option value="company">Företag</option>
                    <option value="association">Förening</option>
                    <option value="partner">Partner</option>
                    <option value="supplier">Leverantör</option>
                    <option value="agent">Agent</option>
                    <option value="private">Privatperson</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={loadContacts}
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
                    Kontaktlista
                  </h2>
                  <p className="text-sm text-slate-500">
                    Visar {filteredTotal} kontakter
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1120px] w-full border-collapse text-left text-sm">
                  <thead className="bg-[#194C66] text-white">
                    <tr>
                      <Th>Kontakt</Th>
                      <Th>Företag</Th>
                      <Th>Kontaktuppgifter</Th>
                      <Th>Typ</Th>
                      <Th>Status</Th>
                      <Th>Ort</Th>
                      <Th>Taggar</Th>
                      <Th>Anteckning</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-8 text-center text-slate-500">
                          Laddar kontakter...
                        </td>
                      </tr>
                    ) : contacts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-10 text-center">
                          <div className="mx-auto max-w-lg">
                            <div className="text-base font-bold text-[#194C66]">
                              Inga kontakter hittades
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              Skapa din första kontakt med knappen Ny kontakt.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      contacts.map((contact) => (
                        <tr key={contact.id} onClick={() => router.push("/admin/crm/kontakter/" + encodeURIComponent(contact.id))} className="cursor-pointer align-top transition hover:bg-slate-50">
                          <Td>
                            <div className="font-bold text-[#194C66]">
                              {displayName(contact)}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {contact.contact_number || "—"}
                            </div>
                          </Td>

                          <Td>
                            <div className="max-w-[220px] truncate font-semibold text-slate-900">
                              {contact.company_name || "—"}
                            </div>
                            {contact.org_number && (
                              <div className="mt-1 text-xs text-slate-500">
                                Org.nr {contact.org_number}
                              </div>
                            )}
                            {contact.role_title && (
                              <div className="mt-1 text-xs text-slate-500">
                                {contact.role_title}
                              </div>
                            )}
                          </Td>

                          <Td>
                            <div className="max-w-[220px] truncate font-semibold text-slate-900">
                              {contact.email || contact.phone || contact.mobile || "—"}
                            </div>
                            {(contact.phone || contact.mobile) && contact.email && (
                              <div className="mt-1 text-xs text-slate-500">
                                {contact.phone || contact.mobile}
                              </div>
                            )}
                          </Td>

                          <Td>
                            <span className="rounded-full bg-[#eef8fb] px-3 py-1 text-xs font-semibold text-[#194C66]">
                              {typeLabel(contact.contact_type)}
                            </span>
                          </Td>

                          <Td>
                            <span
                              className={
                                "inline-flex rounded-full px-3 py-1 text-xs font-semibold " +
                                statusClass(contact.status)
                              }
                            >
                              {statusLabel(contact.status)}
                            </span>
                          </Td>

                          <Td>
                            <div className="font-semibold text-slate-900">
                              {contact.city || "—"}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {contact.country || "Sverige"}
                            </div>
                          </Td>

                          <Td>
                            <div className="flex max-w-[220px] flex-wrap gap-1">
                              {(contact.tags || []).length ? (
                                (contact.tags || []).slice(0, 3).map((tag) => (
                                  <span
                                    key={tag}
                                    className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600"
                                  >
                                    {tag}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </div>
                          </Td>

                          <Td>
                            <div className="max-w-[240px] truncate text-sm text-slate-600">
                              {contact.notes || "—"}
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
