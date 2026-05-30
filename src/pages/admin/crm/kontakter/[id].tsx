import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

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

function displayName(form: FormState) {
  const name = [form.first_name, form.last_name].filter(Boolean).join(" ").trim();
  return name || form.company_name || "Kontakt";
}

export default function CrmKontaktDetailPage() {
  const router = useRouter();
  const id = String(router.query.id || "");

  const [form, setForm] = useState<FormState>(emptyForm);
  const [contactNumber, setContactNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function loadContact() {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/crm/kontakter/" + encodeURIComponent(id));
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta kontakten.");
      }

      const contact = json.contact || {};

      setContactNumber(contact.contact_number || "");

      setForm({
        first_name: contact.first_name || "",
        last_name: contact.last_name || "",
        company_name: contact.company_name || "",
        org_number: contact.org_number || "",
        role_title: contact.role_title || "",
        email: contact.email || "",
        phone: contact.phone || "",
        mobile: contact.mobile || "",
        address: contact.address || "",
        postal_code: contact.postal_code || "",
        city: contact.city || "",
        country: contact.country || "Sverige",
        contact_type: contact.contact_type || "customer",
        status: contact.status || "active",
        source: contact.source || "",
        notes: contact.notes || "",
        tags: Array.isArray(contact.tags) ? contact.tags.join(", ") : "",
      });
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function saveContact(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/crm/kontakter/" + encodeURIComponent(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara kontakten.");
      }

      setMessage("Kontakten sparades.");
      await loadContact();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara kontakten.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadContact();
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
                  CRM
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  {loading ? "Kontakt" : displayName(form)}
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  {contactNumber || "Visa och redigera kontaktuppgifter, kategori, status och noteringar."}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/admin/crm/kontakter"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Tillbaka
                </Link>

                <button
                  type="submit"
                  form="contact-edit-form"
                  disabled={saving || loading}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Sparar..." : "Spara kontakt"}
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
                Laddar kontakt...
              </section>
            ) : (
              <form id="contact-edit-form" onSubmit={saveContact} className="space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {contactNumber || "Kontakt"}
                      </div>

                      <h2 className="mt-2 text-2xl font-bold text-[#194C66]">
                        {displayName(form)}
                      </h2>

                      <p className="mt-2 text-sm text-slate-600">
                        {typeLabel(form.contact_type)}
                      </p>
                    </div>

                    <span
                      className={
                        "inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold " +
                        statusClass(form.status)
                      }
                    >
                      {statusLabel(form.status)}
                    </span>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Kontaktuppgifter
                  </h2>

                  <div className="mt-5 grid gap-4 lg:grid-cols-3">
                    <Field label="Förnamn" value={form.first_name} onChange={(value) => updateField("first_name", value)} />
                    <Field label="Efternamn" value={form.last_name} onChange={(value) => updateField("last_name", value)} />
                    <Field label="Företag / organisation" value={form.company_name} onChange={(value) => updateField("company_name", value)} />

                    <Field label="Org.nr" value={form.org_number} onChange={(value) => updateField("org_number", value)} />
                    <Field label="Roll / titel" value={form.role_title} onChange={(value) => updateField("role_title", value)} />
                    <Field label="Källa" value={form.source} onChange={(value) => updateField("source", value)} />

                    <Field label="E-post" value={form.email} onChange={(value) => updateField("email", value)} />
                    <Field label="Telefon" value={form.phone} onChange={(value) => updateField("phone", value)} />
                    <Field label="Mobil" value={form.mobile} onChange={(value) => updateField("mobile", value)} />
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Adress & klassificering
                  </h2>

                  <div className="mt-5 grid gap-4 lg:grid-cols-3">
                    <Field label="Adress" value={form.address} onChange={(value) => updateField("address", value)} />
                    <Field label="Postnummer" value={form.postal_code} onChange={(value) => updateField("postal_code", value)} />
                    <Field label="Ort" value={form.city} onChange={(value) => updateField("city", value)} />
                    <Field label="Land" value={form.country} onChange={(value) => updateField("country", value)} />

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
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Noteringar
                  </h2>

                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <Field
                      label="Taggar"
                      value={form.tags}
                      onChange={(value) => updateField("tags", value)}
                      placeholder="Ex. bröllop, förening, återkommande"
                    />

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Anteckningar
                      </label>
                      <textarea
                        value={form.notes}
                        onChange={(event) => updateField("notes", event.target.value)}
                        rows={6}
                        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                      />
                    </div>
                  </div>
                </section>

                <div className="flex justify-end gap-3">
                  <Link
                    href="/admin/crm/kontakter"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                  >
                    Avbryt
                  </Link>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Sparar..." : "Spara kontakt"}
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
