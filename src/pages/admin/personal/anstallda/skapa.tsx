import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type FormState = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  employment_type: string;
  status: string;
  city: string;
  address: string;
  personal_number: string;
  emergency_contact: string;
  emergency_phone: string;
  driver_license: string;
  driver_card_number: string;
  ykb_expiry_date: string;
  driver_card_expiry_date: string;
  medical_certificate_expiry_date: string;
  notes: string;
};

const emptyForm: FormState = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  role: "employee",
  employment_type: "hourly",
  status: "active",
  city: "",
  address: "",
  personal_number: "",
  emergency_contact: "",
  emergency_phone: "",
  driver_license: "",
  driver_card_number: "",
  ykb_expiry_date: "",
  driver_card_expiry_date: "",
  medical_certificate_expiry_date: "",
  notes: "",
};

export default function SkapaAnstalldPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function saveEmployee(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      const res = await fetch("/api/admin/personal/anstallda", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara anställd.");
      }

      router.push("/admin/personal/anstallda");
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara anställd.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="px-6 pb-8 pt-10">
          <form onSubmit={saveEmployee} className="w-full space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00645d]">
                  Personal
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  Lägg till anställd
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Skapa personalprofil för chaufför, bokningsagent, trafikledare eller administrativ personal.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/admin/personal/anstallda"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Tillbaka
                </Link>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Sparar..." : "Spara anställd"}
                </button>
              </div>
            </div>

            {error && (
              <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
                {error}
              </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#194C66]">
                Grunduppgifter
              </h2>

              <div className="mt-5 grid gap-4 lg:grid-cols-4">
                <Field label="Förnamn" value={form.first_name} onChange={(value) => updateField("first_name", value)} />
                <Field label="Efternamn" value={form.last_name} onChange={(value) => updateField("last_name", value)} />
                <Field label="E-post" value={form.email} onChange={(value) => updateField("email", value)} />
                <Field label="Telefon" value={form.phone} onChange={(value) => updateField("phone", value)} />

                <SelectField
                  label="Roll"
                  value={form.role}
                  onChange={(value) => updateField("role", value)}
                  options={[
                    ["employee", "Anställd"],
                    ["driver", "Chaufför"],
                    ["traffic_manager", "Trafikledare"],
                    ["booking_agent", "Bokningsagent"],
                    ["admin", "Administratör"],
                  ]}
                />

                <SelectField
                  label="Anställningstyp"
                  value={form.employment_type}
                  onChange={(value) => updateField("employment_type", value)}
                  options={[
                    ["hourly", "Timanställd"],
                    ["full_time", "Heltid"],
                    ["part_time", "Deltid"],
                    ["consultant", "Konsult"],
                  ]}
                />

                <SelectField
                  label="Status"
                  value={form.status}
                  onChange={(value) => updateField("status", value)}
                  options={[
                    ["active", "Aktiv"],
                    ["pending", "På gång"],
                    ["inactive", "Inaktiv"],
                    ["ended", "Avslutad"],
                  ]}
                />

                <Field label="Personnummer" value={form.personal_number} onChange={(value) => updateField("personal_number", value)} />
                <Field label="Ort" value={form.city} onChange={(value) => updateField("city", value)} />
                <Field label="Adress" value={form.address} onChange={(value) => updateField("address", value)} />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#194C66]">
                Chaufförsuppgifter
              </h2>

              <div className="mt-5 grid gap-4 lg:grid-cols-4">
                <Field label="Körkort / behörighet" value={form.driver_license} onChange={(value) => updateField("driver_license", value)} placeholder="Ex. D, DE" />
                <Field label="Förarkortsnummer" value={form.driver_card_number} onChange={(value) => updateField("driver_card_number", value)} />
                <Field label="YKB giltigt till" type="date" value={form.ykb_expiry_date} onChange={(value) => updateField("ykb_expiry_date", value)} />
                <Field label="Förarkort giltigt till" type="date" value={form.driver_card_expiry_date} onChange={(value) => updateField("driver_card_expiry_date", value)} />
                <Field label="Läkarintyg giltigt till" type="date" value={form.medical_certificate_expiry_date} onChange={(value) => updateField("medical_certificate_expiry_date", value)} />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#194C66]">
                Anhörig / nödkontakt
              </h2>

              <div className="mt-5 grid gap-4 lg:grid-cols-4">
                <Field label="Kontaktperson" value={form.emergency_contact} onChange={(value) => updateField("emergency_contact", value)} />
                <Field label="Telefon" value={form.emergency_phone} onChange={(value) => updateField("emergency_phone", value)} />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#194C66]">
                Anteckningar
              </h2>

              <textarea
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                rows={8}
                placeholder="Ex. tillgänglighet, interna noteringar, utbildningar, särskilda krav..."
                className="mt-5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
              />
            </section>

            <div className="flex justify-end gap-3">
              <Link
                href="/admin/personal/anstallda"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
              >
                Avbryt
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Sparar..." : "Spara anställd"}
              </button>
            </div>
          </form>
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
