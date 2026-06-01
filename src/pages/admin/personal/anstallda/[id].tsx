import { useEffect, useState } from "react";
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

function roleLabel(role?: string | null) {
  switch (role) {
    case "driver":
      return "Chaufför";
    case "traffic_manager":
      return "Trafikledare";
    case "booking_agent":
      return "Bokningsagent";
    case "admin":
      return "Administratör";
    case "employee":
      return "Anställd";
    default:
      return role || "Anställd";
  }
}

function employmentTypeLabel(type?: string | null) {
  switch (type) {
    case "full_time":
      return "Heltid";
    case "part_time":
      return "Deltid";
    case "hourly":
      return "Timanställd";
    case "consultant":
      return "Konsult";
    default:
      return type || "Ej satt";
  }
}

function statusLabel(status?: string | null) {
  switch (status) {
    case "active":
      return "Aktiv";
    case "inactive":
      return "Inaktiv";
    case "pending":
      return "På gång";
    case "ended":
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
      return "bg-amber-100 text-amber-700";
    case "inactive":
    case "ended":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function roleClass(role?: string | null) {
  switch (role) {
    case "driver":
      return "bg-[#eef8fb] text-[#194C66]";
    case "traffic_manager":
      return "bg-blue-100 text-blue-700";
    case "booking_agent":
      return "bg-purple-100 text-purple-700";
    case "admin":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function fullName(form: FormState) {
  return [form.first_name, form.last_name].filter(Boolean).join(" ") || "Anställd";
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

export default function PersonalAnstalldDetailPage() {
  const router = useRouter();
  const id = String(router.query.id || "");

  const [form, setForm] = useState<FormState>(emptyForm);
  const [createdAt, setCreatedAt] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function loadEmployee() {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/personal/anstallda/" + encodeURIComponent(id));
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta anställd.");
      }

      const employee = json.employee || {};

      setCreatedAt(employee.created_at || "");
      setUpdatedAt(employee.updated_at || "");

      setForm({
        first_name: employee.first_name || "",
        last_name: employee.last_name || "",
        email: employee.email || "",
        phone: employee.phone || "",
        role: employee.role || "employee",
        employment_type: employee.employment_type || "hourly",
        status: employee.status || "active",
        city: employee.city || "",
        address: employee.address || "",
        personal_number: employee.personal_number || "",
        emergency_contact: employee.emergency_contact || "",
        emergency_phone: employee.emergency_phone || "",
        driver_license: employee.driver_license || "",
        driver_card_number: employee.driver_card_number || "",
        ykb_expiry_date: employee.ykb_expiry_date ? String(employee.ykb_expiry_date).slice(0, 10) : "",
        driver_card_expiry_date: employee.driver_card_expiry_date ? String(employee.driver_card_expiry_date).slice(0, 10) : "",
        medical_certificate_expiry_date: employee.medical_certificate_expiry_date ? String(employee.medical_certificate_expiry_date).slice(0, 10) : "",
        notes: employee.notes || "",
      });
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function saveEmployee(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/personal/anstallda/" + encodeURIComponent(id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara anställd.");
      }

      setMessage("Anställd sparades.");
      await loadEmployee();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara anställd.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadEmployee();
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
                  Personal
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  {loading ? "Anställd" : fullName(form)}
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  {roleLabel(form.role)} · {employmentTypeLabel(form.employment_type)}
                  {updatedAt ? " · Uppdaterad " + new Date(updatedAt).toLocaleString("sv-SE") : ""}
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
                  form="employee-edit-form"
                  disabled={saving || loading}
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

            {message && (
              <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-700">
                {message}
              </section>
            )}

            {loading ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
                Laddar anställd...
              </section>
            ) : (
              <form id="employee-edit-form" onSubmit={saveEmployee} className="space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Personalprofil
                      </div>

                      <h2 className="mt-2 text-2xl font-bold text-[#194C66]">
                        {fullName(form)}
                      </h2>

                      <p className="mt-2 text-sm text-slate-600">
                        {form.email || "E-post saknas"} · {form.phone || "Telefon saknas"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className={"inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold " + roleClass(form.role)}>
                        {roleLabel(form.role)}
                      </span>

                      <span className={"inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold " + statusClass(form.status)}>
                        {statusLabel(form.status)}
                      </span>
                    </div>
                  </div>
                </section>

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

                  <div className="mt-5 grid gap-4 md:grid-cols-3">
                    <ExpiryBox label="YKB" value={form.ykb_expiry_date} />
                    <ExpiryBox label="Förarkort" value={form.driver_card_expiry_date} />
                    <ExpiryBox label="Läkarintyg" value={form.medical_certificate_expiry_date} />
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
            )}
          </div>
        </main>
      </div>
    </>
  );
}

function ExpiryBox({ label, value }: { label: string; value: string }) {
  const warning = isExpiringSoon(value);

  return (
    <div className={"rounded-xl px-4 py-3 " + (warning ? "bg-amber-50 text-amber-800" : "bg-slate-50 text-slate-700")}>
      <div className="text-xs font-semibold uppercase tracking-wide opacity-70">
        {label}
      </div>
      <div className="mt-1 font-semibold">
        {fmtDate(value)}
      </div>
      {warning && (
        <div className="mt-1 text-xs font-bold">
          Går ut snart
        </div>
      )}
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
