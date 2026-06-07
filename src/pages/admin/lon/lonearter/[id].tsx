import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type FormState = {
  code: string;
  name: string;
  category: string;
  calculation_type: string;
  amount: string;
  percent: string;
  unit: string;
  taxable: boolean;
  pensionable: boolean;
  affects_vacation_pay: boolean;
  is_active: boolean;
  notes: string;
};

const emptyForm: FormState = {
  code: "",
  name: "",
  category: "base_salary",
  calculation_type: "fixed_amount",
  amount: "",
  percent: "",
  unit: "hour",
  taxable: true,
  pensionable: true,
  affects_vacation_pay: true,
  is_active: true,
  notes: "",
};

function categoryLabel(value: string) {
  const map: Record<string, string> = {
    base_salary: "Grundlön",
    ob: "OB / tillägg",
    overtime: "Övertid",
    allowance: "Traktamente / ersättning",
    bonus: "Bonus / provision",
    absence: "Frånvaro",
    deduction: "Avdrag",
    vacation: "Semester",
    other: "Övrigt",
  };

  return map[value] || value || "Löneart";
}

function calculationLabel(value: string) {
  const map: Record<string, string> = {
    fixed_amount: "Fast belopp",
    hourly_amount: "Kr/timme",
    daily_amount: "Kr/dag",
    monthly_amount: "Kr/månad",
    percent: "Procent",
    manual: "Manuell",
  };

  return map[value] || value || "Beräkning";
}

function categoryClass(value: string) {
  if (value === "ob") return "bg-blue-100 text-blue-700";
  if (value === "overtime") return "bg-purple-100 text-purple-700";
  if (value === "allowance") return "bg-emerald-100 text-emerald-700";
  if (value === "bonus") return "bg-amber-100 text-amber-700";
  if (value === "absence" || value === "deduction") return "bg-red-100 text-red-700";
  return "bg-[#eef8fb] text-[#194C66]";
}

export default function LoneartDetailPage() {
  const router = useRouter();
  const id = String(router.query.id || "");

  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createdAt, setCreatedAt] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function loadPayItem() {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/lon/lonearter/" + encodeURIComponent(id));
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta lönearten.");
      }

      const item = json.payItem || {};

      setCreatedAt(item.created_at || "");
      setUpdatedAt(item.updated_at || "");

      setForm({
        code: item.code || "",
        name: item.name || "",
        category: item.category || "base_salary",
        calculation_type: item.calculation_type || "fixed_amount",
        amount: item.amount !== null && item.amount !== undefined ? String(item.amount) : "",
        percent: item.percent !== null && item.percent !== undefined ? String(item.percent) : "",
        unit: item.unit || "hour",
        taxable: Boolean(item.taxable),
        pensionable: Boolean(item.pensionable),
        affects_vacation_pay: Boolean(item.affects_vacation_pay),
        is_active: item.is_active !== false,
        notes: item.notes || "",
      });
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function savePayItem(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/lon/lonearter/" + encodeURIComponent(id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara lönearten.");
      }

      setMessage("Lönearten sparades.");
      await loadPayItem();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara lönearten.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadPayItem();
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
                  Lön
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  {loading ? "Löneart" : form.name || "Löneart"}
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  {form.code || "Kod saknas"} · {categoryLabel(form.category)} · {calculationLabel(form.calculation_type)}
                  {updatedAt ? " · Uppdaterad " + new Date(updatedAt).toLocaleString("sv-SE") : ""}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/admin/lon/lonearter"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#194C66] shadow-sm transition hover:bg-slate-50"
                >
                  Tillbaka
                </Link>

                <button
                  type="submit"
                  form="loneart-edit-form"
                  disabled={saving || loading}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Sparar..." : "Spara löneart"}
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
                Laddar löneart...
              </section>
            ) : (
              <form id="loneart-edit-form" onSubmit={savePayItem} className="space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {form.code}
                      </div>

                      <h2 className="mt-2 text-2xl font-bold text-[#194C66]">
                        {form.name}
                      </h2>

                      <p className="mt-2 text-sm text-slate-600">
                        Här redigerar du belopp, procent och regler för lönearten.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className={"inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold " + categoryClass(form.category)}>
                        {categoryLabel(form.category)}
                      </span>

                      <span className={"inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold " + (form.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700")}>
                        {form.is_active ? "Aktiv" : "Inaktiv"}
                      </span>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Löneartsuppgifter
                  </h2>

                  <div className="mt-5 grid gap-4 lg:grid-cols-4">
                    <Field label="Kod" value={form.code} onChange={(value) => updateField("code", value)} />
                    <Field label="Namn" value={form.name} onChange={(value) => updateField("name", value)} />

                    <SelectField
                      label="Kategori"
                      value={form.category}
                      onChange={(value) => updateField("category", value)}
                      options={[
                        ["base_salary", "Grundlön"],
                        ["ob", "OB / tillägg"],
                        ["overtime", "Övertid"],
                        ["allowance", "Traktamente / ersättning"],
                        ["bonus", "Bonus / provision"],
                        ["absence", "Frånvaro"],
                        ["deduction", "Avdrag"],
                        ["vacation", "Semester"],
                        ["other", "Övrigt"],
                      ]}
                    />

                    <SelectField
                      label="Beräkning"
                      value={form.calculation_type}
                      onChange={(value) => updateField("calculation_type", value)}
                      options={[
                        ["fixed_amount", "Fast belopp"],
                        ["hourly_amount", "Kr/timme"],
                        ["daily_amount", "Kr/dag"],
                        ["monthly_amount", "Kr/månad"],
                        ["percent", "Procent"],
                        ["manual", "Manuell"],
                      ]}
                    />

                    <Field label="Belopp" value={form.amount} onChange={(value) => updateField("amount", value)} />
                    <Field label="Procent" value={form.percent} onChange={(value) => updateField("percent", value)} />

                    <SelectField
                      label="Enhet"
                      value={form.unit}
                      onChange={(value) => updateField("unit", value)}
                      options={[
                        ["hour", "Timme"],
                        ["day", "Dag"],
                        ["month", "Månad"],
                        ["piece", "Styck"],
                        ["trip", "Körning"],
                        ["manual", "Manuell"],
                      ]}
                    />

                    <SelectField
                      label="Aktiv"
                      value={form.is_active ? "true" : "false"}
                      onChange={(value) => updateField("is_active", value === "true")}
                      options={[
                        ["true", "Ja"],
                        ["false", "Nej"],
                      ]}
                    />

                    <CheckboxField label="Skattepliktig" checked={form.taxable} onChange={(value) => updateField("taxable", value)} />
                    <CheckboxField label="Pensionsgrundande" checked={form.pensionable} onChange={(value) => updateField("pensionable", value)} />
                    <CheckboxField label="Påverkar semesterlön" checked={form.affects_vacation_pay} onChange={(value) => updateField("affects_vacation_pay", value)} />
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Anteckning / regel
                  </h2>

                  <textarea
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    rows={8}
                    placeholder="Ex. OB-regel, avtal, intern regel eller beräkningsinformation..."
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

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-[48px] items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300"
      />
      {label}
    </label>
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
