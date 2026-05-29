import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type FormState = {
  title: string;
  customer_name: string;
  company_name: string;
  org_number: string;
  contact_person: string;
  email: string;
  phone: string;
  agreement_type: string;
  status: string;
  discount_percent: string;
  fixed_price: string;
  currency: string;
  valid_from: string;
  valid_until: string;
  notes: string;
  terms: string;
};

const emptyForm: FormState = {
  title: "",
  customer_name: "",
  company_name: "",
  org_number: "",
  contact_person: "",
  email: "",
  phone: "",
  agreement_type: "company",
  status: "draft",
  discount_percent: "",
  fixed_price: "",
  currency: "SEK",
  valid_from: "",
  valid_until: "",
  notes: "",
  terms: "",
};

function toDateInput(value?: string | null) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

export default function CrmAvtalEditPage() {
  const router = useRouter();
  const id = String(router.query.id || "");

  const [form, setForm] = useState<FormState>(emptyForm);
  const [agreementNumber, setAgreementNumber] = useState("");
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

  async function loadAgreement() {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/crm/avtal/" + encodeURIComponent(id));
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta avtalet.");
      }

      const agreement = json.agreement || {};

      setAgreementNumber(agreement.agreement_number || "");

      setForm({
        title: agreement.title || "",
        customer_name: agreement.customer_name || "",
        company_name: agreement.company_name || "",
        org_number: agreement.org_number || "",
        contact_person: agreement.contact_person || "",
        email: agreement.email || "",
        phone: agreement.phone || "",
        agreement_type: agreement.agreement_type || "company",
        status: agreement.status || "draft",
        discount_percent:
          agreement.discount_percent !== null && agreement.discount_percent !== undefined
            ? String(agreement.discount_percent)
            : "",
        fixed_price:
          agreement.fixed_price !== null && agreement.fixed_price !== undefined
            ? String(agreement.fixed_price)
            : "",
        currency: agreement.currency || "SEK",
        valid_from: toDateInput(agreement.valid_from),
        valid_until: toDateInput(agreement.valid_until),
        notes: agreement.notes || "",
        terms: agreement.terms || "",
      });
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function saveAgreement(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/crm/avtal/" + encodeURIComponent(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara avtalet.");
      }

      setMessage("Avtalet sparades.");
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara avtalet.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadAgreement();
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
                  Redigera avtal
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  {agreementNumber || "Uppdatera avtal, kundpris och villkor."}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/admin/crm/avtal"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Tillbaka
                </Link>

                {id && (
                  <Link
                    href={"/admin/crm/avtal/" + encodeURIComponent(id)}
                    className="inline-flex items-center justify-center rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3548]"
                  >
                    Öppna avtal
                  </Link>
                )}
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
                Laddar avtal...
              </section>
            ) : (
              <form onSubmit={saveAgreement} className="space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Grunduppgifter
                  </h2>

                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <Field
                      label="Avtalstitel"
                      value={form.title}
                      onChange={(value) => updateField("title", value)}
                      placeholder="Ex. Företagsavtal 2026"
                    />

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Avtalstyp
                      </label>
                      <select
                        value={form.agreement_type}
                        onChange={(event) => updateField("agreement_type", event.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                      >
                        <option value="company">Företagsavtal</option>
                        <option value="association">Föreningsavtal</option>
                        <option value="agent">Agentavtal</option>
                        <option value="framework">Ramavtal</option>
                        <option value="customer_price">Kundpris</option>
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
                        <option value="draft">Utkast</option>
                        <option value="active">Aktivt</option>
                        <option value="paused">Pausat</option>
                        <option value="expired">Utgånget</option>
                        <option value="cancelled">Avslutat</option>
                      </select>
                    </div>

                    <Field
                      label="Valuta"
                      value={form.currency}
                      onChange={(value) => updateField("currency", value)}
                      placeholder="SEK"
                    />
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Kund & kontakt
                  </h2>

                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <Field
                      label="Företag"
                      value={form.company_name}
                      onChange={(value) => updateField("company_name", value)}
                    />

                    <Field
                      label="Kundnamn"
                      value={form.customer_name}
                      onChange={(value) => updateField("customer_name", value)}
                    />

                    <Field
                      label="Org.nr"
                      value={form.org_number}
                      onChange={(value) => updateField("org_number", value)}
                    />

                    <Field
                      label="Kontaktperson"
                      value={form.contact_person}
                      onChange={(value) => updateField("contact_person", value)}
                    />

                    <Field
                      label="E-post"
                      value={form.email}
                      onChange={(value) => updateField("email", value)}
                    />

                    <Field
                      label="Telefon"
                      value={form.phone}
                      onChange={(value) => updateField("phone", value)}
                    />
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Pris & giltighet
                  </h2>

                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <Field
                      label="Rabatt i %"
                      value={form.discount_percent}
                      onChange={(value) => updateField("discount_percent", value)}
                      placeholder="Ex. 10"
                    />

                    <Field
                      label="Fast pris"
                      value={form.fixed_price}
                      onChange={(value) => updateField("fixed_price", value)}
                      placeholder="Ex. 12900"
                    />

                    <Field
                      label="Giltig från"
                      type="date"
                      value={form.valid_from}
                      onChange={(value) => updateField("valid_from", value)}
                    />

                    <Field
                      label="Giltig till"
                      type="date"
                      value={form.valid_until}
                      onChange={(value) => updateField("valid_until", value)}
                    />
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Anteckningar & villkor
                  </h2>

                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <TextArea
                      label="Anteckningar"
                      value={form.notes}
                      onChange={(value) => updateField("notes", value)}
                    />

                    <TextArea
                      label="Villkor"
                      value={form.terms}
                      onChange={(value) => updateField("terms", value)}
                    />
                  </div>
                </section>

                <div className="flex justify-end gap-3">
                  <Link
                    href="/admin/crm/avtal"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                  >
                    Avbryt
                  </Link>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Sparar..." : "Spara avtal"}
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={8}
        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
      />
    </div>
  );
}
