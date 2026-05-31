import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type FormState = {
  name: string;
  org_number: string;
  contact_person: string;
  email: string;
  phone: string;
  website: string;
  city: string;
  address: string;
  status: string;
  quality_level: string;
  notes: string;
};

const emptyForm: FormState = {
  name: "",
  org_number: "",
  contact_person: "",
  email: "",
  phone: "",
  website: "",
  city: "",
  address: "",
  status: "active",
  quality_level: "normal",
  notes: "",
};

function statusLabel(status?: string | null) {
  switch (status) {
    case "active":
      return "Aktiv";
    case "inactive":
      return "Inaktiv";
    case "paused":
      return "Pausad";
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
    case "paused":
      return "bg-blue-100 text-blue-700";
    case "blocked":
      return "bg-red-100 text-red-700";
    case "inactive":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function qualityLabel(level?: string | null) {
  switch (level) {
    case "high":
      return "Hög";
    case "premium":
      return "Premium";
    case "approved":
      return "Godkänd";
    case "normal":
      return "Normal";
    case "low":
      return "Låg";
    default:
      return level || "Normal";
  }
}

function qualityClass(level?: string | null) {
  switch (level) {
    case "high":
    case "premium":
    case "approved":
      return "bg-[#eef8fb] text-[#194C66]";
    case "low":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function PartnerOperatorDetailPage() {
  const router = useRouter();
  const id = String(router.query.id || "");

  const [form, setForm] = useState<FormState>(emptyForm);
  const [createdAt, setCreatedAt] = useState("");
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

  async function loadOperator() {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/partners/operatorer/" + encodeURIComponent(id));
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta operatören.");
      }

      const operator = json.operator || {};

      setCreatedAt(operator.created_at || "");

      setForm({
        name: operator.name || "",
        org_number: operator.org_number || "",
        contact_person: operator.contact_person || "",
        email: operator.email || "",
        phone: operator.phone || "",
        website: operator.website || "",
        city: operator.city || "",
        address: operator.address || "",
        status: operator.status || "active",
        quality_level: operator.quality_level || "normal",
        notes: operator.notes || "",
      });
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function saveOperator(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/partners/operatorer/" + encodeURIComponent(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          partner_type: "operator",
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara operatören.");
      }

      setMessage("Operatören sparades.");
      await loadOperator();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara operatören.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadOperator();
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
                  {loading ? "Operatör" : form.name || "Operatör"}
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  {form.city || "Ort saknas"}
                  {createdAt ? " · Skapad " + new Date(createdAt).toLocaleString("sv-SE") : ""}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/admin/partners/operatorer"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Tillbaka
                </Link>

                <button
                  type="submit"
                  form="operator-edit-form"
                  disabled={saving || loading}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Sparar..." : "Spara operatör"}
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
                Laddar operatör...
              </section>
            ) : (
              <form id="operator-edit-form" onSubmit={saveOperator} className="space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Operatör / partner
                      </div>

                      <h2 className="mt-2 text-2xl font-bold text-[#194C66]">
                        {form.name || "Operatör"}
                      </h2>

                      <p className="mt-2 text-sm text-slate-600">
                        {form.contact_person || "Kontaktperson saknas"} · {form.email || form.phone || "Kontaktuppgifter saknas"}
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

                      <span
                        className={
                          "inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold " +
                          qualityClass(form.quality_level)
                        }
                      >
                        {qualityLabel(form.quality_level)}
                      </span>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Operatörsuppgifter
                  </h2>

                  <div className="mt-5 grid gap-4 lg:grid-cols-3">
                    <Field label="Operatör / bolag" value={form.name} onChange={(value) => updateField("name", value)} />
                    <Field label="Org.nr" value={form.org_number} onChange={(value) => updateField("org_number", value)} />
                    <Field label="Kontaktperson" value={form.contact_person} onChange={(value) => updateField("contact_person", value)} />

                    <Field label="E-post" value={form.email} onChange={(value) => updateField("email", value)} />
                    <Field label="Telefon" value={form.phone} onChange={(value) => updateField("phone", value)} />
                    <Field label="Webbplats" value={form.website} onChange={(value) => updateField("website", value)} />

                    <Field label="Ort" value={form.city} onChange={(value) => updateField("city", value)} />
                    <Field label="Adress" value={form.address} onChange={(value) => updateField("address", value)} />

                    <SelectField
                      label="Status"
                      value={form.status}
                      onChange={(value) => updateField("status", value)}
                      options={[
                        ["active", "Aktiv"],
                        ["paused", "Pausad"],
                        ["inactive", "Inaktiv"],
                        ["blocked", "Blockerad"],
                      ]}
                    />

                    <SelectField
                      label="Kvalitet"
                      value={form.quality_level}
                      onChange={(value) => updateField("quality_level", value)}
                      options={[
                        ["normal", "Normal"],
                        ["approved", "Godkänd"],
                        ["high", "Hög"],
                        ["premium", "Premium"],
                        ["low", "Låg"],
                      ]}
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
                    href="/admin/partners/operatorer"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                  >
                    Avbryt
                  </Link>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Sparar..." : "Spara operatör"}
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
