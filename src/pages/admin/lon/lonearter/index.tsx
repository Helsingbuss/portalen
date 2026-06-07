import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type PayItemRow = {
  id: string;
  code?: string | null;
  name?: string | null;
  category?: string | null;
  calculation_type?: string | null;
  amount?: number | null;
  percent?: number | null;
  unit?: string | null;
  taxable?: boolean | null;
  pensionable?: boolean | null;
  affects_vacation_pay?: boolean | null;
  is_active?: boolean | null;
  notes?: string | null;
  created_at?: string | null;
};

type ApiResponse = {
  ok: boolean;
  needsSetup?: boolean;
  payItems?: PayItemRow[];
  summary?: {
    total: number;
    active: number;
    ob: number;
    allowance: number;
    bonus: number;
    deduction: number;
  };
  error?: string;
};

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

function categoryLabel(category?: string | null) {
  switch (category) {
    case "base_salary":
      return "Grundlön";
    case "ob":
      return "OB / tillägg";
    case "overtime":
      return "Övertid";
    case "allowance":
      return "Traktamente / ersättning";
    case "bonus":
      return "Bonus / provision";
    case "absence":
      return "Frånvaro";
    case "deduction":
      return "Avdrag";
    case "vacation":
      return "Semester";
    case "other":
      return "Övrigt";
    default:
      return category || "Löneart";
  }
}

function calculationTypeLabel(type?: string | null) {
  switch (type) {
    case "fixed_amount":
      return "Fast belopp";
    case "hourly_amount":
      return "Kr/timme";
    case "daily_amount":
      return "Kr/dag";
    case "monthly_amount":
      return "Kr/månad";
    case "percent":
      return "Procent";
    case "manual":
      return "Manuell";
    default:
      return type || "Beräkning";
  }
}

function unitLabel(unit?: string | null) {
  switch (unit) {
    case "hour":
      return "Timme";
    case "day":
      return "Dag";
    case "month":
      return "Månad";
    case "piece":
      return "Styck";
    case "trip":
      return "Körning";
    case "manual":
      return "Manuell";
    default:
      return unit || "Enhet";
  }
}

function categoryClass(category?: string | null) {
  switch (category) {
    case "base_salary":
      return "bg-[#eef8fb] text-[#194C66]";
    case "ob":
      return "bg-blue-100 text-blue-700";
    case "overtime":
      return "bg-purple-100 text-purple-700";
    case "allowance":
      return "bg-emerald-100 text-emerald-700";
    case "bonus":
      return "bg-amber-100 text-amber-700";
    case "absence":
    case "deduction":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function fmtMoney(value?: number | null) {
  if (value === null || value === undefined) return "—";

  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function fmtPercent(value?: number | null) {
  if (value === null || value === undefined) return "—";

  return new Intl.NumberFormat("sv-SE", {
    maximumFractionDigits: 2,
  }).format(Number(value || 0)) + " %";
}

export default function LonLonearterPage() {
  const [payItems, setPayItems] = useState<PayItemRow[]>([]);
  const [summary, setSummary] = useState<ApiResponse["summary"]>({
    total: 0,
    active: 0,
    ob: 0,
    allowance: 0,
    bonus: 0,
    deduction: 0,
  });

  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [active, setActive] = useState("true");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadPayItems() {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (q.trim()) params.set("q", q.trim());
      if (category) params.set("category", category);
      if (active) params.set("active", active);

      const res = await fetch("/api/admin/lon/lonearter?" + params.toString());
      const json: ApiResponse = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta lönearter.");
      }

      setPayItems(json.payItems || []);
      setSummary(json.summary || { total: 0, active: 0, ob: 0, allowance: 0, bonus: 0, deduction: 0 });
      setNeedsSetup(Boolean(json.needsSetup));
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function createPayItem(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/lon/lonearter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara lönearten.");
      }

      setMessage("Lönearten sparades.");
      setForm(emptyForm);
      setShowForm(false);
      await loadPayItems();
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara lönearten.");
    } finally {
      setSaving(false);
    }
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };

      if (key === "category") {
        if (value === "ob" || value === "overtime") {
          next.calculation_type = "hourly_amount";
          next.unit = "hour";
        }

        if (value === "allowance") {
          next.calculation_type = "daily_amount";
          next.unit = "day";
        }

        if (value === "bonus") {
          next.calculation_type = "fixed_amount";
          next.unit = "manual";
        }

        if (value === "deduction" || value === "absence") {
          next.affects_vacation_pay = false;
        }
      }

      return next;
    });
  }

  useEffect(() => {
    loadPayItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTotal = useMemo(() => payItems.length, [payItems]);

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
                  Lönearter
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Här skapar du grunden för löneberäkning: timlön, OB, övertid, traktamente, bonus, provision, frånvaro och avdrag.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm((value) => !value)}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49]"
                >
                  {showForm ? "Stäng formulär" : "Ny löneart"}
                </button>

                <button
                  type="button"
                  onClick={loadPayItems}
                  className="inline-flex items-center justify-center rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3548]"
                >
                  Uppdatera
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-6">
              <SummaryCard label="Totalt" value={summary?.total || 0} />
              <SummaryCard label="Aktiva" value={summary?.active || 0} tone="green" />
              <SummaryCard label="OB" value={summary?.ob || 0} tone="blue" />
              <SummaryCard label="Ersättningar" value={summary?.allowance || 0} tone="slate" />
              <SummaryCard label="Bonus" value={summary?.bonus || 0} tone="amber" />
              <SummaryCard label="Avdrag" value={summary?.deduction || 0} tone="red" />
            </div>

            {needsSetup && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800 shadow-sm">
                <h2 className="text-base font-bold">
                  Löneartstabellen saknas ännu
                </h2>
                <p className="mt-2 text-sm leading-6">
                  Tabellen <strong>payroll_pay_items</strong> saknas i databasen. Kör SQL-koden nedan så kan lönearter sparas.
                </p>
              </section>
            )}

            {showForm && (
              <form
                onSubmit={createPayItem}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-2 border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-[#194C66]">
                    Ny löneart
                  </h2>
                  <p className="text-sm text-slate-500">
                    Skapa exempelvis OB kväll, OB helg, övertid, traktamente, bonus/provision eller avdrag.
                  </p>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-4">
                  <Field label="Kod" value={form.code} onChange={(value) => updateField("code", value)} placeholder="Ex. OB-KVALL" />
                  <Field label="Namn" value={form.name} onChange={(value) => updateField("name", value)} placeholder="Ex. OB kväll" />

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

                  <Field label="Belopp" value={form.amount} onChange={(value) => updateField("amount", value)} placeholder="Ex. 45" />
                  <Field label="Procent" value={form.percent} onChange={(value) => updateField("percent", value)} placeholder="Ex. 50" />

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

                <div className="mt-4">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Anteckning
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    rows={4}
                    placeholder="Ex. används för kvälls-OB efter kl 18, helgtillägg, intern regel eller avtal..."
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
                    {saving ? "Sparar..." : "Spara löneart"}
                  </button>
                </div>
              </form>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[1fr_260px_180px_140px]">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Sök
                  </label>
                  <input
                    value={q}
                    onChange={(event) => setQ(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") loadPayItems();
                    }}
                    placeholder="Sök kod, namn, kategori eller anteckning..."
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
                  />
                </div>

                <SelectField
                  label="Kategori"
                  value={category}
                  onChange={setCategory}
                  options={[
                    ["", "Alla kategorier"],
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
                  label="Aktiv"
                  value={active}
                  onChange={setActive}
                  options={[
                    ["", "Alla"],
                    ["true", "Aktiva"],
                    ["false", "Inaktiva"],
                  ]}
                />

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={loadPayItems}
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
                    Register över lönearter
                  </h2>
                  <p className="text-sm text-slate-500">
                    Visar {filteredTotal} lönearter
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1180px] w-full border-collapse text-left text-sm">
                  <thead className="bg-[#194C66] text-white">
                    <tr>
                      <Th>Kod</Th>
                      <Th>Namn</Th>
                      <Th>Kategori</Th>
                      <Th>Beräkning</Th>
                      <Th>Belopp / procent</Th>
                      <Th>Enhet</Th>
                      <Th>Regler</Th>
                      <Th>Status</Th>
                      <Th>Anteckning</Th>
                      <Th>Öppna</Th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={10} className="px-5 py-8 text-center text-slate-500">
                          Laddar lönearter...
                        </td>
                      </tr>
                    ) : payItems.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-5 py-10 text-center">
                          <div className="mx-auto max-w-lg">
                            <div className="text-base font-bold text-[#194C66]">
                              Inga lönearter hittades
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              Skapa första lönearten med knappen Ny löneart.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      payItems.map((item) => (
                        <tr key={item.id} onClick={() => { window.location.href = "/admin/lon/lonearter/" + encodeURIComponent(item.id); }} className="cursor-pointer align-top transition hover:bg-slate-50">
                          <Td>
                            <div className="font-bold text-[#194C66]">
                              {item.code || "—"}
                            </div>
                          </Td>

                          <Td>
                            <div className="font-bold text-slate-900">
                              {item.name || "—"}
                            </div>
                          </Td>

                          <Td>
                            <span className={"inline-flex rounded-full px-3 py-1 text-xs font-semibold " + categoryClass(item.category)}>
                              {categoryLabel(item.category)}
                            </span>
                          </Td>

                          <Td>{calculationTypeLabel(item.calculation_type)}</Td>

                          <Td>
                            <div className="font-semibold text-slate-900">
                              {item.calculation_type === "percent" ? fmtPercent(item.percent) : fmtMoney(item.amount)}
                            </div>
                          </Td>

                          <Td>{unitLabel(item.unit)}</Td>

                          <Td>
                            <div className="space-y-1 text-xs text-slate-600">
                              <div>Skatt: {item.taxable ? "Ja" : "Nej"}</div>
                              <div>Pension: {item.pensionable ? "Ja" : "Nej"}</div>
                              <div>Semester: {item.affects_vacation_pay ? "Ja" : "Nej"}</div>
                            </div>
                          </Td>

                          <Td>
                            <span className={"inline-flex rounded-full px-3 py-1 text-xs font-semibold " + (item.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700")}>
                              {item.is_active ? "Aktiv" : "Inaktiv"}
                            </span>
                          </Td>

                          <Td>
                            <div className="max-w-[260px] truncate text-slate-600">
                              {item.notes || "—"}
                            </div>
                          </Td>

                          <Td>
                            <button
                              type="button"
                              aria-label="Öppna löneart"
                              onClick={(event) => {
                                event.stopPropagation();
                                window.location.href = "/admin/lon/lonearter/" + encodeURIComponent(item.id);
                              }}
                              className="rounded-xl bg-[#00645d] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#004f49]"
                            >
                              Öppna
                            </button>
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
  tone?: "green" | "amber" | "red" | "blue" | "slate";
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
            : tone === "slate"
              ? "text-slate-700 bg-slate-50"
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
