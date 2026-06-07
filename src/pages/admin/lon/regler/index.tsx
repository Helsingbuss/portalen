import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type FormState = {
  rule_year: string;

  employer_fee_standard_percent: string;
  employer_fee_pensioner_percent: string;
  employer_fee_youth_percent: string;
  youth_monthly_limit: string;

  tax_deduction_mode: string;
  side_income_tax_percent: string;
  min_annual_payment_for_tax: string;

  vacation_pay_percent_default: string;
  standard_hours_per_month: string;

  domestic_per_diem_full_day: string;
  domestic_per_diem_half_day: string;
  domestic_per_diem_after_three_months: string;
  domestic_per_diem_after_two_years: string;
  domestic_per_diem_night: string;

  pay_period_start_day: string;
  pay_period_end_day: string;
  payout_day: string;

  swedbank_export_enabled: boolean;
  swedbank_export_format: string;
  bank_export_requires_manual_approval: boolean;

  is_active: boolean;
  notes: string;
};

const emptyForm: FormState = {
  rule_year: "2026",

  employer_fee_standard_percent: "31.42",
  employer_fee_pensioner_percent: "10.21",
  employer_fee_youth_percent: "20.81",
  youth_monthly_limit: "25000",

  tax_deduction_mode: "table_or_decision",
  side_income_tax_percent: "30",
  min_annual_payment_for_tax: "1000",

  vacation_pay_percent_default: "12",
  standard_hours_per_month: "174",

  domestic_per_diem_full_day: "300",
  domestic_per_diem_half_day: "150",
  domestic_per_diem_after_three_months: "210",
  domestic_per_diem_after_two_years: "150",
  domestic_per_diem_night: "150",

  pay_period_start_day: "1",
  pay_period_end_day: "31",
  payout_day: "25",

  swedbank_export_enabled: false,
  swedbank_export_format: "iso20022_pain001",
  bank_export_requires_manual_approval: true,

  is_active: true,
  notes:
    "Standardinställningar för svensk lön 2026. Kontrollera alltid mot revisor, kollektivavtal och aktuella regler innan lönekörning.",
};

function toForm(value: any): FormState {
  const source = value || emptyForm;

  return {
    rule_year: String(source.rule_year ?? emptyForm.rule_year),

    employer_fee_standard_percent: String(source.employer_fee_standard_percent ?? emptyForm.employer_fee_standard_percent),
    employer_fee_pensioner_percent: String(source.employer_fee_pensioner_percent ?? emptyForm.employer_fee_pensioner_percent),
    employer_fee_youth_percent: String(source.employer_fee_youth_percent ?? emptyForm.employer_fee_youth_percent),
    youth_monthly_limit: String(source.youth_monthly_limit ?? emptyForm.youth_monthly_limit),

    tax_deduction_mode: String(source.tax_deduction_mode ?? emptyForm.tax_deduction_mode),
    side_income_tax_percent: String(source.side_income_tax_percent ?? emptyForm.side_income_tax_percent),
    min_annual_payment_for_tax: String(source.min_annual_payment_for_tax ?? emptyForm.min_annual_payment_for_tax),

    vacation_pay_percent_default: String(source.vacation_pay_percent_default ?? emptyForm.vacation_pay_percent_default),
    standard_hours_per_month: String(source.standard_hours_per_month ?? emptyForm.standard_hours_per_month),

    domestic_per_diem_full_day: String(source.domestic_per_diem_full_day ?? emptyForm.domestic_per_diem_full_day),
    domestic_per_diem_half_day: String(source.domestic_per_diem_half_day ?? emptyForm.domestic_per_diem_half_day),
    domestic_per_diem_after_three_months: String(source.domestic_per_diem_after_three_months ?? emptyForm.domestic_per_diem_after_three_months),
    domestic_per_diem_after_two_years: String(source.domestic_per_diem_after_two_years ?? emptyForm.domestic_per_diem_after_two_years),
    domestic_per_diem_night: String(source.domestic_per_diem_night ?? emptyForm.domestic_per_diem_night),

    pay_period_start_day: String(source.pay_period_start_day ?? emptyForm.pay_period_start_day),
    pay_period_end_day: String(source.pay_period_end_day ?? emptyForm.pay_period_end_day),
    payout_day: String(source.payout_day ?? emptyForm.payout_day),

    swedbank_export_enabled: Boolean(source.swedbank_export_enabled ?? emptyForm.swedbank_export_enabled),
    swedbank_export_format: String(source.swedbank_export_format ?? emptyForm.swedbank_export_format),
    bank_export_requires_manual_approval: Boolean(source.bank_export_requires_manual_approval ?? emptyForm.bank_export_requires_manual_approval),

    is_active: Boolean(source.is_active ?? emptyForm.is_active),
    notes: String(source.notes ?? emptyForm.notes),
  };
}

function taxModeLabel(value: string) {
  switch (value) {
    case "table_or_decision":
      return "Skattetabell / beslut";
    case "flat_percent":
      return "Fast procent";
    case "manual":
      return "Manuell hantering";
    default:
      return value || "Skatt";
  }
}

export default function LonSkatterReglerPage() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function loadSettings() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/lon/regler");
      const json = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte hämta skatter och regler.");
      }

      setNeedsSetup(Boolean(json.needsSetup));
      setForm(toForm(json.settings || json.defaults || emptyForm));
    } catch (err: any) {
      setError(err?.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch("/api/admin/lon/regler", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Kunde inte spara skatter och regler.");
      }

      setMessage("Skatter och regler sparades.");
      setForm(toForm(json.settings));
      setNeedsSetup(false);
    } catch (err: any) {
      setError(err?.message || "Kunde inte spara skatter och regler.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <>
      <AdminMenu />

      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="px-6 pb-8 pt-10">
          <form onSubmit={saveSettings} className="w-full space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00645d]">
                  Lön
                </p>

                <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#194C66]">
                  Skatter & regler
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  Grundinställningar för arbetsgivaravgifter, skatteavdrag, semesterersättning, traktamente, löneperiod och Swedbank-export.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={loadSettings}
                  className="inline-flex items-center justify-center rounded-xl bg-[#194C66] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f3548]"
                >
                  Uppdatera
                </button>

                <button
                  type="submit"
                  disabled={saving || loading || needsSetup}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Sparar..." : "Spara regler"}
                </button>
              </div>
            </div>

            {needsSetup && (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800 shadow-sm">
                <h2 className="text-base font-bold">
                  Tabellen saknas ännu
                </h2>
                <p className="mt-2 text-sm leading-6">
                  Tabellen <strong>payroll_rule_settings</strong> saknas i databasen. Kör SQL-koden nedan och uppdatera sidan.
                </p>
              </section>
            )}

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

            <div className="grid gap-4 md:grid-cols-4">
              <InfoCard label="Löneår" value={form.rule_year} />
              <InfoCard label="Arbetsgivaravgift" value={form.employer_fee_standard_percent + " %"} tone="blue" />
              <InfoCard label="Semester standard" value={form.vacation_pay_percent_default + " %"} tone="green" />
              <InfoCard label="Utbetalningsdag" value={"Dag " + form.payout_day} tone="amber" />
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#194C66]">
                Arbetsgivaravgifter
              </h2>

              <div className="mt-5 grid gap-4 lg:grid-cols-4">
                <Field label="Löneår" value={form.rule_year} onChange={(value) => updateField("rule_year", value)} />
                <Field label="Full arbetsgivaravgift %" value={form.employer_fee_standard_percent} onChange={(value) => updateField("employer_fee_standard_percent", value)} />
                <Field label="Ålderspensionsavgift %" value={form.employer_fee_pensioner_percent} onChange={(value) => updateField("employer_fee_pensioner_percent", value)} />
                <Field label="Ungdomsavgift %" value={form.employer_fee_youth_percent} onChange={(value) => updateField("employer_fee_youth_percent", value)} />
                <Field label="Ungdomsgräns/månad" value={form.youth_monthly_limit} onChange={(value) => updateField("youth_monthly_limit", value)} />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#194C66]">
                Skatteavdrag
              </h2>

              <div className="mt-5 grid gap-4 lg:grid-cols-4">
                <SelectField
                  label="Skatteläge"
                  value={form.tax_deduction_mode}
                  onChange={(value) => updateField("tax_deduction_mode", value)}
                  options={[
                    ["table_or_decision", "Skattetabell / beslut"],
                    ["flat_percent", "Fast procent"],
                    ["manual", "Manuell hantering"],
                  ]}
                />

                <Field label="Sidoinkomst / standard %" value={form.side_income_tax_percent} onChange={(value) => updateField("side_income_tax_percent", value)} />
                <Field label="Gräns per år för skatteavdrag" value={form.min_annual_payment_for_tax} onChange={(value) => updateField("min_annual_payment_for_tax", value)} />
                <ReadOnly label="Visning" value={taxModeLabel(form.tax_deduction_mode)} />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#194C66]">
                Semester & arbetstid
              </h2>

              <div className="mt-5 grid gap-4 lg:grid-cols-4">
                <Field label="Semesterersättning standard %" value={form.vacation_pay_percent_default} onChange={(value) => updateField("vacation_pay_percent_default", value)} />
                <Field label="Standard timmar/månad" value={form.standard_hours_per_month} onChange={(value) => updateField("standard_hours_per_month", value)} />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#194C66]">
                Traktamente Sverige
              </h2>

              <div className="mt-5 grid gap-4 lg:grid-cols-5">
                <Field label="Hel dag" value={form.domestic_per_diem_full_day} onChange={(value) => updateField("domestic_per_diem_full_day", value)} />
                <Field label="Halv dag" value={form.domestic_per_diem_half_day} onChange={(value) => updateField("domestic_per_diem_half_day", value)} />
                <Field label="Efter tre månader" value={form.domestic_per_diem_after_three_months} onChange={(value) => updateField("domestic_per_diem_after_three_months", value)} />
                <Field label="Efter två år" value={form.domestic_per_diem_after_two_years} onChange={(value) => updateField("domestic_per_diem_after_two_years", value)} />
                <Field label="Nattraktamente" value={form.domestic_per_diem_night} onChange={(value) => updateField("domestic_per_diem_night", value)} />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#194C66]">
                Löneperiod & utbetalning
              </h2>

              <div className="mt-5 grid gap-4 lg:grid-cols-4">
                <Field label="Period start dag" value={form.pay_period_start_day} onChange={(value) => updateField("pay_period_start_day", value)} />
                <Field label="Period slut dag" value={form.pay_period_end_day} onChange={(value) => updateField("pay_period_end_day", value)} />
                <Field label="Utbetalningsdag" value={form.payout_day} onChange={(value) => updateField("payout_day", value)} />
                <SelectField
                  label="Aktiv"
                  value={form.is_active ? "true" : "false"}
                  onChange={(value) => updateField("is_active", value === "true")}
                  options={[
                    ["true", "Ja"],
                    ["false", "Nej"],
                  ]}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#194C66]">
                Swedbank / bankexport
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Här förbereder vi bankfil. Betalning ska fortfarande granskas, godkännas och signeras i banken innan pengar skickas.
              </p>

              <div className="mt-5 grid gap-4 lg:grid-cols-4">
                <SelectField
                  label="Swedbank-export"
                  value={form.swedbank_export_enabled ? "true" : "false"}
                  onChange={(value) => updateField("swedbank_export_enabled", value === "true")}
                  options={[
                    ["false", "Av"],
                    ["true", "På"],
                  ]}
                />

                <SelectField
                  label="Exportformat"
                  value={form.swedbank_export_format}
                  onChange={(value) => updateField("swedbank_export_format", value)}
                  options={[
                    ["iso20022_pain001", "ISO 20022 pain.001"],
                    ["manual_csv", "Manuell CSV"],
                    ["none", "Ingen export"],
                  ]}
                />

                <SelectField
                  label="Kräver manuell godkänning"
                  value={form.bank_export_requires_manual_approval ? "true" : "false"}
                  onChange={(value) => updateField("bank_export_requires_manual_approval", value === "true")}
                  options={[
                    ["true", "Ja"],
                    ["false", "Nej"],
                  ]}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#194C66]">
                Intern anteckning
              </h2>

              <textarea
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                rows={8}
                placeholder="Ex. kontrollera med revisor, kollektivavtal, lokala OB-regler eller bankavtal..."
                className="mt-5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
              />
            </section>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving || loading || needsSetup}
                className="inline-flex items-center justify-center rounded-xl bg-[#00645d] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#004f49] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Sparar..." : "Spara skatter & regler"}
              </button>
            </div>
          </form>
        </main>
      </div>
    </>
  );
}

function InfoCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "green" | "amber" | "blue";
}) {
  const color =
    tone === "green"
      ? "text-emerald-700 bg-emerald-50"
      : tone === "amber"
        ? "text-amber-700 bg-amber-50"
        : tone === "blue"
          ? "text-blue-700 bg-blue-50"
          : "text-[#194C66] bg-white";

  return (
    <div className={"rounded-2xl border border-slate-200 p-5 shadow-sm " + color}>
      <div className="text-sm font-semibold opacity-80">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}

function Field({
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
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#194C66] focus:ring-2 focus:ring-[#194C66]/10"
      />
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
        {value}
      </div>
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
